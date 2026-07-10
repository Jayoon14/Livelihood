import { useState } from "react";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { login, logout } from "../../services/authService";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await login(email, password);

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }


    const {
      data: { user },
    } = await supabase.auth.getUser();


    if (!user) {
      setLoading(false);
      alert("Unable to retrieve user.");
      return;
    }


    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();


    setLoading(false);



    // ADMIN
    if (!profile) {
      navigate("/dashboard");
      return;
    }


    if (profile.role === "admin") {
      navigate("/dashboard");
      return;
    }



    // WORKER
    if (profile.role === "worker") {

      if (profile.status !== "Approved") {

        alert(
          "Your account is waiting for admin approval."
        );

        await logout();

        return;
      }


      navigate("/worker/dashboard");

      return;
    }



    // CUSTOMER
    if (profile.role === "customer") {

      navigate("/customer/dashboard");

      return;
    }



    alert("Unknown account role.");

    await logout();
  }



  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">


      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">



        {/* LOGO */}

        <div className="flex flex-col items-center mb-8">

          <div className="
            w-20 
            h-20 
            bg-blue-600 
            rounded-full 
            flex 
            items-center 
            justify-center 
            text-white 
            text-3xl 
            font-bold
          ">
            L
          </div>


          <h1 className="text-2xl font-bold mt-4">
            Livelihood Services Platform
          </h1>


          <p className="text-gray-500 text-sm">
            Your Local Skilled Worker Partner
          </p>

        </div>




        <h2 className="text-xl font-semibold mb-6">
          Welcome Back
        </h2>




        {/* EMAIL */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            Email Address
          </label>


          <div className="
            mt-2 
            flex 
            items-center 
            border 
            rounded-lg 
            px-3
          ">


            <User className="w-5 h-5 text-gray-400" />


            <input
              type="email"
              placeholder="Enter email"
              className="w-full p-3 outline-none"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />


          </div>

        </div>





        {/* PASSWORD */}

        <div>


          <label className="text-sm font-medium">
            Password
          </label>


          <div className="
            mt-2 
            flex 
            items-center 
            border 
            rounded-lg 
            px-3
          ">


            <Lock className="w-5 h-5 text-gray-400" />


            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter password"
              className="w-full p-3 outline-none"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />



            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
            >

              {showPassword ? (

                <EyeOff className="w-5 h-5 text-gray-500" />

              ) : (

                <Eye className="w-5 h-5 text-gray-500" />

              )}

            </button>
          </div>
        </div>

        {/* REMEMBER + FORGOT PASSWORD */}

        <div className="flex justify-between mt-5 text-sm">


          <label className="flex items-center gap-2">

            <input type="checkbox" />

            Remember me

          </label>



          <Link
            to="/forgot-password"
            className="
              text-blue-600 
              hover:underline
            "
          >
            Forgot Password?
          </Link>


        </div>

        {/* LOGIN BUTTON */}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="
            mt-6 
            w-full 
            bg-blue-600 
            hover:bg-blue-700 
            disabled:bg-gray-400 
            text-white 
            py-3 
            rounded-lg 
            font-semibold 
            transition
          "
        >

          {loading
            ? "Logging in..."
            : "Login"}

        </button>

        {/* REGISTER */}

        <p className="text-center mt-6 text-sm">
          Don't have an account?
          <Link
            to="/register-choice"
            className="
              ml-1 
              text-blue-600 
              font-semibold 
              hover:underline
            "
          >
            Register
          </Link>
        </p>
      </div>


    </div>
  );
}