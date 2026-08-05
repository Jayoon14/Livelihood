-- =========================================================
-- LIVELIHOODGO PHASE 3
-- RESERVATION, PROJECT LIFECYCLE, EARLY RELEASE, EXTENSIONS
-- Run after Phase 2 smart-booking migration.
-- =========================================================

begin;

alter table public.bookings
  add column if not exists reservation_status text
    not null default 'available',
  add column if not exists actual_start_at timestamptz,
  add column if not exists actual_completed_at timestamptz,
  add column if not exists extended_until timestamptz,
  add column if not exists extension_requested_until timestamptz,
  add column if not exists extension_status text,
  add column if not exists extension_reason text,
  add column if not exists extension_requested_at timestamptz,
  add column if not exists extension_responded_at timestamptz;

update public.bookings
set reservation_status =
  case
    when lower(trim(coalesce(status, ''))) = 'completed'
      then 'completed'
    when lower(trim(coalesce(status, ''))) in ('cancelled', 'rejected')
      then 'cancelled'
    when lower(trim(coalesce(status, ''))) in ('on going', 'ongoing', 'in progress')
      or lower(trim(coalesce(trip_status, ''))) = 'on trip'
      then 'working'
    when lower(trim(coalesce(status, ''))) = 'approved'
      and scheduled_start_at is not null
      and scheduled_start_at > now()
      then 'reserved'
    when lower(trim(coalesce(status, ''))) = 'approved'
      and scheduled_start_at is not null
      and scheduled_start_at <= now()
      then 'working'
    else 'available'
  end;

alter table public.bookings
  drop constraint if exists bookings_reservation_status_check;

alter table public.bookings
  add constraint bookings_reservation_status_check
  check (
    reservation_status in (
      'available',
      'reserved',
      'working',
      'completed',
      'cancelled'
    )
  );

alter table public.bookings
  drop constraint if exists bookings_extension_status_check;

alter table public.bookings
  add constraint bookings_extension_status_check
  check (
    extension_status is null
    or extension_status in (
      'Pending',
      'Approved',
      'Rejected'
    )
  );

create index if not exists bookings_reservation_status_idx
  on public.bookings (worker_id, reservation_status);

create index if not exists bookings_extension_status_idx
  on public.bookings (customer_id, extension_status);

create or replace function public.sync_booking_project_lifecycle()
returns trigger
language plpgsql
as $$
declare
  normalized_status text;
  normalized_trip_status text;
begin
  normalized_status := lower(trim(coalesce(new.status, '')));
  normalized_trip_status := lower(trim(coalesce(new.trip_status, '')));

  if normalized_status = 'completed'
     or lower(trim(coalesce(new.completion_status, ''))) = 'customer confirmed'
  then
    new.reservation_status := 'completed';

    if new.actual_completed_at is null then
      new.actual_completed_at := now();
    end if;

  elsif normalized_status in ('cancelled', 'rejected') then
    new.reservation_status := 'cancelled';

  elsif normalized_status in ('on going', 'ongoing', 'in progress')
        or normalized_trip_status = 'on trip'
  then
    new.reservation_status := 'working';

    if new.actual_start_at is null then
      new.actual_start_at := now();
    end if;

  elsif normalized_status = 'approved'
        and new.scheduled_start_at is not null
        and new.scheduled_start_at > now()
  then
    new.reservation_status := 'reserved';

  elsif normalized_status = 'approved'
        and new.scheduled_start_at is not null
        and new.scheduled_start_at <= now()
  then
    new.reservation_status := 'working';

  else
    new.reservation_status := 'available';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_booking_project_lifecycle_trigger
on public.bookings;

create trigger sync_booking_project_lifecycle_trigger
before insert or update of
  status,
  trip_status,
  completion_status,
  scheduled_start_at,
  scheduled_end_at,
  extended_until
on public.bookings
for each row
execute function public.sync_booking_project_lifecycle();

create or replace function public.request_project_extension(
  p_booking_id bigint,
  p_worker_id uuid,
  p_requested_until timestamptz,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_booking public.bookings%rowtype;
  current_end timestamptz;
begin
  select *
  into current_booking
  from public.bookings
  where id = p_booking_id
    and worker_id = p_worker_id
    and coalesce(worker_deleted, false) = false
    and coalesce(is_deleted, false) = false
  for update;

  if not found then
    raise exception 'Booking was not found or is not assigned to this worker.';
  end if;

  if lower(trim(coalesce(current_booking.status, '')))
     not in ('approved', 'on going', 'ongoing', 'in progress')
  then
    raise exception 'Only an approved or ongoing project can be extended.';
  end if;

  current_end := coalesce(
    current_booking.extended_until,
    current_booking.scheduled_end_at
  );

  if current_end is null then
    raise exception 'The current project completion date is missing.';
  end if;

  if p_requested_until <= current_end then
    raise exception 'The requested completion date must be later than the current completion date.';
  end if;

  if exists (
    select 1
    from public.bookings other_booking
    where other_booking.worker_id = current_booking.worker_id
      and other_booking.id <> current_booking.id
      and lower(trim(coalesce(other_booking.status, '')))
          in ('pending', 'approved', 'on going', 'ongoing', 'in progress')
      and other_booking.scheduled_start_at is not null
      and coalesce(
        other_booking.extended_until,
        other_booking.scheduled_end_at
      ) is not null
      and current_booking.scheduled_start_at
          < coalesce(
              other_booking.extended_until,
              other_booking.scheduled_end_at
            )
      and p_requested_until > other_booking.scheduled_start_at
  ) then
    raise exception 'The requested extension overlaps another active booking.';
  end if;

  update public.bookings
  set
    extension_requested_until = p_requested_until,
    extension_status = 'Pending',
    extension_reason = nullif(trim(coalesce(p_reason, '')), ''),
    extension_requested_at = now(),
    extension_responded_at = null
  where id = p_booking_id
  returning * into current_booking;

  insert into public.notifications (
    user_id,
    booking_id,
    title,
    message,
    is_read
  )
  values (
    current_booking.customer_id,
    current_booking.id,
    'Project Extension Requested',
    'The worker requested a new estimated completion date. Open the booking details to approve or reject it.',
    false
  );

  return current_booking;
end;
$$;

create or replace function public.respond_project_extension(
  p_booking_id bigint,
  p_customer_id uuid,
  p_approved boolean
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_booking public.bookings%rowtype;
begin
  select *
  into current_booking
  from public.bookings
  where id = p_booking_id
    and customer_id = p_customer_id
    and coalesce(customer_deleted, false) = false
    and coalesce(is_deleted, false) = false
  for update;

  if not found then
    raise exception 'Booking was not found or does not belong to this customer.';
  end if;

  if current_booking.extension_status is distinct from 'Pending'
     or current_booking.extension_requested_until is null
  then
    raise exception 'There is no pending extension request for this booking.';
  end if;

  if p_approved then
    if exists (
      select 1
      from public.bookings other_booking
      where other_booking.worker_id = current_booking.worker_id
        and other_booking.id <> current_booking.id
        and lower(trim(coalesce(other_booking.status, '')))
            in ('pending', 'approved', 'on going', 'ongoing', 'in progress')
        and other_booking.scheduled_start_at is not null
        and coalesce(
          other_booking.extended_until,
          other_booking.scheduled_end_at
        ) is not null
        and current_booking.scheduled_start_at
            < coalesce(
                other_booking.extended_until,
                other_booking.scheduled_end_at
              )
        and current_booking.extension_requested_until
            > other_booking.scheduled_start_at
    ) then
      raise exception 'This extension now overlaps another active booking.';
    end if;

    update public.bookings
    set
      extended_until = extension_requested_until,
      scheduled_end_at = extension_requested_until,
      extension_status = 'Approved',
      extension_responded_at = now()
    where id = p_booking_id
    returning * into current_booking;
  else
    update public.bookings
    set
      extension_status = 'Rejected',
      extension_responded_at = now()
    where id = p_booking_id
    returning * into current_booking;
  end if;

  insert into public.notifications (
    user_id,
    booking_id,
    title,
    message,
    is_read
  )
  values (
    current_booking.worker_id,
    current_booking.id,
    case
      when p_approved then 'Project Extension Approved'
      else 'Project Extension Rejected'
    end,
    case
      when p_approved then
        'The customer approved the requested project extension.'
      else
        'The customer rejected the requested project extension.'
    end,
    false
  );

  return current_booking;
end;
$$;

grant execute on function public.request_project_extension(
  bigint,
  uuid,
  timestamptz,
  text
) to authenticated;

grant execute on function public.respond_project_extension(
  bigint,
  uuid,
  boolean
) to authenticated;

commit;
