import { useEffect } from "react";
import Navbar from "./components/navbar/navbar";
import Authentication from "./pages/Authentication/Authentication";
import Dachborad from "./pages/Dashboard/Dashboard";
import ProductPagedetails from "./pages/ProductPagedetails/ProductPagedetails";
import Cart from "./pages/Cart/Cart";
import Home from "./pages/Home/Home";
import Categories from "./pages/Categories/Categories";
import Checkout from "./pages/Checkout/Checkout";
import Contact from "./pages/Contact/Contact";
import About from "./pages/About/About";
import ProductsPage from "./pages/ProductPage/ProductPage";
import MyOrders from "./pages/Myorder/Myorder";
import NotificationPermission from "./components/Notificationpermission";
import { useLocation } from "react-router-dom";
import { Routes, Route } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}

function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./components/Notificationpermission");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Navbar />
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/authentication" element={<Authentication />} />
        <Route path="/product/:id" element={<ProductPagedetails />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/dashboard" element={<Dachborad />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/Myorder" element={<MyOrders/>} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  );
}

export default App;