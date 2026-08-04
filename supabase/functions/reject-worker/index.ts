import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  console.log("reject-worker invoked", {
    method: request.method,
    hasAuthorization: Boolean(
      request.headers.get("Authorization"),
    ),
  });

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error(
        "Required Supabase environment variables are missing.",
      );
    }

    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          error: "Authentication is required.",
        },
        401,
      );
    }

    const token = authorization.slice(
      "Bearer ".length,
    );

    const callerClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser(token);

    if (callerError || !caller) {
      console.error(
        "Unable to authenticate caller:",
        callerError,
      );

      return jsonResponse(
        {
          error: "Invalid administrator session.",
        },
        401,
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: callerProfile,
      error: callerProfileError,
    } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileError) {
      throw callerProfileError;
    }

    const callerRole = String(
      callerProfile?.role ?? "",
    )
      .trim()
      .toLowerCase();

    if (callerRole !== "admin") {
      return jsonResponse(
        {
          error:
            "Only an administrator can reject a worker.",
        },
        403,
      );
    }

    const body = (await request.json()) as {
      workerId?: unknown;
      reason?: unknown;
    };

    const workerId = String(
      body.workerId ?? "",
    ).trim();

    const reason = String(
      body.reason ?? "",
    ).trim();

    if (!workerId) {
      return jsonResponse(
        {
          error: "Worker ID is required.",
        },
        400,
      );
    }

    const {
      data: worker,
      error: workerError,
    } = await admin
      .from("profiles")
      .select("*")
      .eq("id", workerId)
      .eq("role", "worker")
      .maybeSingle();

    if (workerError) {
      throw workerError;
    }

    if (!worker) {
      return jsonResponse(
        {
          error: "Worker account was not found.",
        },
        404,
      );
    }

    console.log("Rejecting worker", {
      workerId,
      email: worker.email ?? null,
    });

    const removeFolder = async (
      bucket: string,
    ): Promise<void> => {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(workerId, {
          limit: 1000,
          offset: 0,
        });

      if (error) {
        console.warn(
          `Unable to list ${bucket}; continuing:`,
          error.message,
        );
        return;
      }

      const paths = (data ?? [])
        .filter(
          (item) =>
            item.id !== null &&
            item.id !== undefined,
        )
        .map(
          (item) =>
            `${workerId}/${item.name}`,
        );

      if (!paths.length) {
        return;
      }

      const { error: removeError } =
        await admin.storage
          .from(bucket)
          .remove(paths);

      if (removeError) {
        console.warn(
          `Unable to clear ${bucket}; continuing:`,
          removeError.message,
        );
      }
    };

    /*
     * Storage cleanup is best-effort. A missing bucket or file must
     * not prevent deletion of the authentication account.
     */
    await Promise.allSettled([
      removeFolder("profile-picture"),
      removeFolder("worker-documents"),
    ]);

    /*
     * Delete child records before deleting the worker profile.
     * Ignore missing-table errors only when the table does not exist;
     * other database errors still stop the operation.
     */
    const childTables = [
      {
        table: "documents",
        column: "profile_id",
      },
      {
        table: "worker_skills",
        column: "profile_id",
      },
      {
        table: "work_experience",
        column: "profile_id",
      },
      {
        table: "education",
        column: "profile_id",
      },
      {
        table: "services",
        column: "worker_id",
      },
      {
        table: "worker_schedules",
        column: "worker_id",
      },
      {
        table: "unavailable_dates",
        column: "worker_id",
      },
    ] as const;

    for (const item of childTables) {
      const { error } = await admin
        .from(item.table)
        .delete()
        .eq(item.column, workerId);

      if (error) {
        const message = error.message.toLowerCase();

        if (
          message.includes("does not exist") ||
          message.includes("could not find the table")
        ) {
          console.warn(
            `Skipping missing table ${item.table}.`,
          );
          continue;
        }

        throw new Error(
          `Unable to clear ${item.table}: ${error.message}`,
        );
      }
    }

    /*
     * Delete Auth user first. Database cascades/triggers can then
     * remove the profile. If the profile remains, delete it explicitly.
     */
    const { error: authDeleteError } =
      await admin.auth.admin.deleteUser(
        workerId,
        false,
      );

    if (authDeleteError) {
      throw new Error(
        `Unable to delete worker authentication account: ${authDeleteError.message}`,
      );
    }

    const { error: profileDeleteError } =
      await admin
        .from("profiles")
        .delete()
        .eq("id", workerId)
        .eq("role", "worker");

    if (profileDeleteError) {
      console.warn(
        "Auth user deleted, but explicit profile cleanup failed:",
        profileDeleteError.message,
      );
    }

    console.log(
      "Worker rejected and permanently deleted.",
      {
        workerId,
      },
    );

    return jsonResponse({
      success: true,
      message:
        "Worker registration rejected and permanently deleted.",
      worker: {
        ...worker,
        status: "Rejected",
      },
      rejectedEmail: worker.email ?? null,
      reason: reason || null,
    });
  } catch (error) {
    console.error(
      "Reject worker failed:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reject and delete the worker.",
      },
      500,
    );
  }
});