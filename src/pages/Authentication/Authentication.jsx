import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainContext } from "../../utils/context";
import RegisterForm from "../../components/Registerandlogin/Register";
import LoginForm from "../../components/Registerandlogin/Login";
import { TailSpin } from "react-loader-spinner";
import { motion } from "framer-motion";
import { signInWithGoogle } from "../../utils/firebasefunction";
function Authentication() {
  const [registerMode, setRegisterMode] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  const { user, loading } = useContext(MainContext);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || pageLoading) {
    return (
      <div className="auth-loader">
        <TailSpin
          height="33"
          width="33"
          color="rgb(70, 70, 73)"
        />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="auth-header">
          <h2>
            {registerMode ? "Create Account" : "Sign In"}
          </h2>

          <p>
            {registerMode
              ? "Join us today and create your account to get started."
              : "Welcome back! Please enter your credentials."}
          </p>
        </div>

        {registerMode ? <RegisterForm /> : <LoginForm />}

        <p className="auth-switch">
          {registerMode ? (
            <>
              Already have an account?{" "}
              <span onClick={() => setRegisterMode(false)}>
                Sign In
              </span>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <span onClick={() => setRegisterMode(true)}>
                Create Account
              </span>
              
            </>
          )}
        </p>
      </motion.div>
      
    </div>
  );
}

export default Authentication; 