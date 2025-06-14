import { useNavigate } from 'react-router-dom';

// Simple router compatibility layer for components using Next.js routing patterns
export const useCompatRouter = () => {
  const navigate = useNavigate();

  return {
    push: (path: string) => {
      navigate(path);
    },
    replace: (path: string) => {
      navigate(path, { replace: true });
    },
    back: () => {
      navigate(-1);
    },
    forward: () => {
      navigate(1);
    }
  };
};

// Export a mock Link component if needed
export const Link = ({ href, children, ...props }: any) => {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}; 