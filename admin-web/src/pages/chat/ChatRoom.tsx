import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  supabase,
} from "../../lib/supabase";

import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  unsubscribe,
  markMessagesSeen,
  uploadChatImage,
  sendImage,
  uploadChatFile,
  sendFile,
} from "../../services/chatService";


export default function ChatRoom() {

  const {
    bookingId,
  } = useParams();


  const [
    messages,
    setMessages,
  ] = useState<any[]>([]);


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    userId,
    setUserId,
  ] = useState("");


  const [
    uploading,
    setUploading,
  ] = useState(false);


  const [
    otherTyping,
    setOtherTyping,
  ] = useState(false);


  const bottomRef =
    useRef<HTMLDivElement>(null);


  const typingChannel =
    useRef<any>(null);



  useEffect(() => {

    let channel: any;


    async function init() {

      const {
        data: {
          user,
        },
      } =
      await supabase.auth.getUser();


      if (!user)
        return;


      setUserId(
        user.id
      );


      await loadMessages();


      await markMessagesSeen(
        Number(bookingId),
        user.id
      );



      channel =
        subscribeToMessages(
          Number(bookingId),
          async () => {

            await loadMessages();


            await markMessagesSeen(
              Number(bookingId),
              user.id
            );

          }
        );



      const presence =
        supabase.channel(
          `typing-${bookingId}`,
          {
            config: {
              presence: {
                key: user.id,
              },
            },
          }
        );



      typingChannel.current =
        presence;



      presence
        .on(
          "presence",
          {
            event: "sync",
          },
          () => {

            const state =
              presence.presenceState();



            const others =
              Object.keys(state)
                .filter(
                  id =>
                    id !== user.id
                );



            setOtherTyping(
              others.length > 0
            );

          }
        )
        .subscribe();

    }


    init();



    return () => {

      if (channel) {

        unsubscribe(
          channel
        );

      }



      if (
        typingChannel.current
      ) {

        supabase.removeChannel(
          typingChannel.current
        );

      }

    };


  }, [bookingId]);



  async function loadMessages() {

    const data =
      await getMessages(
        Number(bookingId)
      );


    setMessages(
      data
    );


    requestAnimationFrame(() => {

      bottomRef.current
        ?.scrollIntoView({
          behavior: "smooth",
        });

    });

  }



  function handleTyping(
    value: string
  ) {

    setMessage(
      value
    );


    if (
      typingChannel.current
    ) {

      typingChannel.current.track({
        typing: true,
      });

    }



    setTimeout(() => {

      if (
        typingChannel.current
      ) {

        typingChannel.current.track({
          typing: false,
        });

      }

    }, 1500);

  }



  async function handleSend() {

    if (
      !message.trim()
    )
      return;



    await sendMessage(
      Number(bookingId),
      userId,
      message.trim()
    );


    setMessage("");

  }



  async function handleImage(
    e: any
  ) {

    const file =
      e.target.files?.[0];


    if (!file)
      return;



    setUploading(
      true
    );


    try {

      const {
        data: {
          user,
        },
      } =
      await supabase.auth.getUser();



      if (!user)
        return;



      const url =
        await uploadChatImage(
          file
        );



      await sendImage(
        Number(bookingId),
        user.id,
        url
      );


    } finally {

      setUploading(
        false
      );


      e.target.value = "";

    }

  }



  async function handleFile(
    e: any
  ) {

    const file =
      e.target.files?.[0];


    if (!file)
      return;



    try {

      const {
        data: {
          user,
        },
      } =
      await supabase.auth.getUser();



      if (!user)
        return;



      const uploaded =
        await uploadChatFile(
          file
        );



      await sendFile(
        Number(bookingId),
        user.id,
        uploaded.url,
        uploaded.name
      );


    } finally {

      e.target.value = "";

    }

  }
    return (

    <div
      className="
        max-w-4xl
        mx-auto
        h-screen
        flex
        flex-col
        bg-gray-100
      "
    >


      <div
        className="
          bg-blue-600
          text-white
          px-5
          py-4
          font-bold
          text-lg
        "
      >
        Chat
      </div>



      <div
        className="
          flex-1
          overflow-y-auto
          p-4
        "
      >

        {
          messages.length === 0 && (

            <div
              className="
                text-center
                text-gray-500
                mt-5
              "
            >
              No messages yet.
            </div>

          )
        }



        {
          messages.map(
            (msg: any) => {

              const mine =
                msg.sender_id === userId;


              return (

                <div
                  key={msg.id}
                  className={`
                    flex
                    mb-3
                    ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }
                  `}
                >

                  <div
                    className={`
                      max-w-xs
                      md:max-w-md
                      px-4
                      py-3
                      rounded-2xl
                      shadow
                      ${
                        mine
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-800"
                      }
                    `}
                  >


                    {
                      !mine && (

                        <p
                          className="
                            text-sm
                            font-semibold
                            mb-1
                          "
                        >
                          {msg.sender?.first_name}{" "}
                          {msg.sender?.last_name}
                        </p>

                      )
                    }



                    {
                      msg.image_url ? (

                        <img
                          src={msg.image_url}
                          className="
                            rounded-xl
                            max-w-xs
                            max-h-80
                            object-cover
                          "
                        />

                      ) : (

                        <p>
                          {msg.message}
                        </p>

                      )
                    }



                    {
                      msg.file_url && (

                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="
                            block
                            mt-2
                            text-blue-500
                            underline
                            text-sm
                          "
                        >
                          📄 {msg.file_name}
                        </a>

                      )
                    }



                    <p
                      className="
                        text-[11px]
                        opacity-70
                        mt-2
                        text-right
                      "
                    >
                      {
                        new Date(
                          msg.created_at
                        )
                        .toLocaleTimeString()
                      }
                    </p>



                    {
                      mine && (

                        <p
                          className="
                            text-[11px]
                            opacity-70
                            text-right
                          "
                        >
                          {
                            msg.seen_at
                              ? "✓✓ Seen"
                              : "✓ Sent"
                          }
                        </p>

                      )
                    }


                  </div>


                </div>

              );

            }
          )
        }



        {
          otherTyping && (

            <div
              className="
                text-sm
                text-gray-500
                italic
                px-2
                mb-2
              "
            >
              Typing...
            </div>

          )
        }



        <div
          ref={bottomRef}
        />

      </div>




      <div
        className="
          bg-white
          border-t
          p-4
          flex
          gap-2
          items-center
        "
      >


        <label
          className="
            bg-gray-200
            hover:bg-gray-300
            px-3
            py-2
            rounded-xl
            cursor-pointer
          "
        >
          📷

          <input
            hidden
            type="file"
            accept="image/*"
            onChange={handleImage}
          />

        </label>



        <label
          className="
            bg-gray-200
            hover:bg-gray-300
            px-3
            py-2
            rounded-xl
            cursor-pointer
          "
        >
          📎

          <input
            hidden
            type="file"
            onChange={handleFile}
          />

        </label>



        <input
          value={message}
          onChange={(e) =>
            handleTyping(
              e.target.value
            )
          }
          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            ) {

              handleSend();

            }

          }}
          placeholder="Type a message..."
          className="
            flex-1
            border
            rounded-xl
            px-4
            py-2
            outline-none
            focus:ring-2
            focus:ring-blue-500
          "
        />



        <button
          disabled={
            !message.trim()
            ||
            uploading
          }
          onClick={handleSend}
          className="
            bg-blue-600
            hover:bg-blue-700
            disabled:bg-gray-400
            text-white
            px-5
            py-2
            rounded-xl
            font-semibold
          "
        >
          {
            uploading
              ? "Uploading..."
              : "Send"
          }
        </button>


      </div>


    </div>

  );

}