
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./Home";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home page
    navigate("/", { replace: true });
  }, [navigate]);

  return <Home />;
};

export default Index;
