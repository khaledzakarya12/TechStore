import { useState } from "react";
import { FiUser, FiMail, FiPhone, FiLock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../utils/firebaseconfig";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

function RegisterForm() {
  const [inputs, setInputs] = useState({
    fullname: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) =>
    setInputs({ ...inputs, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        inputs.email,
        inputs.password
      );

      const user = res.user;

      await updateProfile(user, {
        displayName: inputs.fullname,
      });

      await user.reload();

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullname: inputs.fullname,
        email: inputs.email,
        phone: inputs.phone,
        role: "user",
        createdAt: serverTimestamp(),
      });

      setCurrentUser(user);

      navigate("/");
    } catch (err) {
      setError("An error occurred while creating your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="form-auth">
      <div className="form-group">
        <div className="input-wrapper">
          <FiUser className="input-icon" />
          <input
            type="text"
            name="fullname"
            placeholder="Full Name"
            value={inputs.fullname}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <FiMail className="input-icon" />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={inputs.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <FiPhone className="input-icon" />
          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            value={inputs.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <FiLock className="input-icon" />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={inputs.password}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {currentUser && (
        <div className="welcome-message">
          Welcome, <b>{currentUser.displayName}</b> 👋
        </div>
      )}

      <button type="submit" className="form-button" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}

export default RegisterForm;