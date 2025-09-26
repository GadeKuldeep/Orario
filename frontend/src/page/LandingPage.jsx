import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Add this import
import "./LandingPage.css";

const LandingPage = () => {
  const homeRef = useRef(null);
  const aboutRef = useRef(null);
  const productsRef = useRef(null);
  const contactRef = useRef(null);
  const navigate = useNavigate(); // ✅ Add this hook

  const [currentImage, setCurrentImage] = useState(0);

  const scrollToSection = (ref) => {
    ref.current.scrollIntoView({ behavior: "smooth" });
  };

  const goToLogin = () => {
    navigate("/login"); // ✅ Use navigate instead of window.location.href
  };

  // 🔄 Background image carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % 3); // loop over 3 images
    }, 6000); // every 6 seconds
    return () => clearInterval(interval);
  }, []);

  const bgImages = [
    "https://plus.unsplash.com/premium_photo-1691588961759-e61c6e241082?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y29sbGFnZSUyMHN0dWRlbnRzfGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1654366698665-e61c6e611a9aaa9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Y29sbGFnZSUyMHN0dWRlbnRzfGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1741636174546-0d8c52a5aa00?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGNvbGxhZ2UlMjBzdHVkZW50c3xlbnwwfHwwfHx8MA%3D%3D"
  ];

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo">Orario</h2>
        <ul>
          <li onClick={() => scrollToSection(homeRef)}>Home</li>
          <li onClick={() => scrollToSection(aboutRef)}>About</li>
          <li onClick={() => scrollToSection(productsRef)}>Products</li>
          <li onClick={() => scrollToSection(contactRef)}>Contact</li>
        </ul>
      </nav>

      {/* Sections */}
      <section
        ref={homeRef}
        className="section home"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${bgImages[currentImage]})`
        }}
      >
        <h1>Welcome To The Orario Portal</h1>
        <button className="login-btn" onClick={goToLogin}>
          Login
        </button>
      </section>

      <section ref={aboutRef} className="section about">
        <h2>About Us</h2>
        <p>
          Orario is an intelligent web-based platform designed to revolutionize classroom and
          timetable scheduling for higher education institutions. It simplifies complex scheduling
          challenges by optimizing classroom utilization, balancing faculty workload, and ensuring a
          seamless learning experience for students. With smart conflict detection, real-time
          notifications, and role-based dashboards for admins, faculty, and students, Orario
          delivers efficiency, transparency, and adaptability. Built with modern technology, it
          empowers institutions to move beyond manual spreadsheets and embrace a smarter, automated,
          and future-ready scheduling system.
        </p>
      </section>

      <section ref={productsRef} className="section products">
        <h2>Our Products</h2>
        <div className="product-list">
          <div className="product-card">Product 1</div>
          <div className="product-card">Product 2</div>
          <div className="product-card">Product 3</div>
        </div>
      </section>

      <section ref={contactRef} className="section contact">
        <h2>Contact Us</h2>
        <form className="contact-form">
          <input type="text" placeholder="Your Name" />
          <input type="email" placeholder="Your Email" />
          <textarea placeholder="Your Message"></textarea>
          <button type="submit">Send</button>
        </form>
      </section>
    </div>
  );
};

export default LandingPage;