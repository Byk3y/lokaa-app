// Auth Modal utility functions

// Direct login modal function
export function showDirectLoginModal(event?: React.MouseEvent) {
  console.log("showDirectLoginModal utility function started");
  
  // Prevent any event bubbling
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Check if modal already exists
  if (document.getElementById('direct-login-modal')) {
    console.log("Login modal already exists, not creating a new one");
    return;
  }
  
  // Ensure the current page stays in the background
  // First save the current body styles
  const originalBodyOverflow = document.body.style.overflow;
  
  // Create a full HTML modal with inline script
  const modalHtml = `
    <div id="direct-login-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);">
      <div id="direct-login-content" style="background-color: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative; animation: modal-pop 0.3s ease-out forwards;">
        <button 
          id="direct-login-close" 
          style="position: absolute; top: 12px; right: 12px; font-size: 24px; border: none; background: none; cursor: pointer; color: #718096;"
          onclick="document.body.removeChild(document.getElementById('direct-login-modal')); document.body.style.overflow = '${originalBodyOverflow}';"
        >×</button>
        
        <div style="margin-bottom: 16px; text-align: center;">
          <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #333;">
            Log in to Lokaa
          </h2>
        </div>
        
        <div id="direct-login-error" style="color: #e53e3e; margin-bottom: 1rem; font-size: 0.875rem; display: none;"></div>
        
        <div style="margin-bottom: 1rem;">
          <input 
            type="email" 
            id="direct-login-email" 
            placeholder="Email" 
            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;"
            required
          />
        </div>
        
        <div style="margin-bottom: 1rem;">
          <input 
            type="password" 
            id="direct-login-password" 
            placeholder="Password" 
            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;"
            required
          />
        </div>

        <div style="text-align: right; margin-bottom: 1rem;">
          <a 
            href="#" 
            style="font-size: 0.875rem; color: #0d9488; text-decoration: none;"
            onclick="event.preventDefault(); document.body.removeChild(document.getElementById('direct-login-modal')); document.body.style.overflow = '${originalBodyOverflow}'; window.showDirectForgotPasswordModal(); return false;"
          >Forgot password?</a>
        </div>
        
        <button 
          id="direct-login-submit"
          style="width: 100%; padding: 0.75rem; background-color: #0d9488; color: white; border: none; border-radius: 9999px; font-weight: 500; cursor: pointer; margin-bottom: 1rem;"
          onclick="handleDirectLogin()"
        >
          LOG IN
        </button>

        <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 0.875rem; color: #4a5568;">
            Don't have an account? 
            <a 
              href="#" 
              style="color: #0d9488; text-decoration: none; font-weight: 500;"
              onclick="event.preventDefault(); document.body.removeChild(document.getElementById('direct-login-modal')); document.body.style.overflow = '${originalBodyOverflow}'; window.showDirectSignupModal(); return false;"
            >Sign up for free</a>
          </p>
        </div>
      </div>
    </div>
    <style>
      @keyframes modal-pop {
        0% { transform: scale(0.95); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
  `;
  
  // Prevent scrolling on the body while the modal is active
  document.body.style.overflow = 'hidden';
  
  // Inject the modal HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHtml;
  document.body.appendChild(tempDiv.firstElementChild);
  
  // Now add the login function directly to window
  // @ts-ignore
  window.handleDirectLogin = async function() {
    console.log("Direct login handler called");
    
    const emailInput = document.getElementById('direct-login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('direct-login-password') as HTMLInputElement;
    const errorDiv = document.getElementById('direct-login-error');
    const submitBtn = document.getElementById('direct-login-submit') as HTMLButtonElement;
    
    if (!emailInput || !passwordInput || !errorDiv || !submitBtn) {
      console.error("Login form elements not found");
      return;
    }
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Validate email and password
    if (!email || !password) {
      errorDiv.textContent = "Please enter both email and password";
      errorDiv.style.display = "block";
      return;
    }
    
    console.log("Attempting login with email:", email);
    
    // Show loading state
    submitBtn.innerHTML = 'Logging in...';
    submitBtn.setAttribute('disabled', 'true');
    
    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    
    // Attempt to sign in with retry logic
    let retryCount = 0;
    const maxRetries = 2;
    let supabaseClient = null;
    
    // Safari-specific: Clear any existing token to prevent state conflicts
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('sb-'))
        .forEach(key => {
          console.log(`Preparing login - clearing key: ${key}`);
          localStorage.removeItem(key);
        });
    } catch (e) {
      console.warn('Failed to clear existing tokens:', e);
      // Continue despite this error
    }
    
    while (retryCount <= maxRetries) {
      try {
        // First try to import the Supabase client
        if (!supabaseClient) {
          console.log(`Importing Supabase client (attempt ${retryCount + 1})`);
          
          try {
            // Set a timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("Timeout: Failed to load authentication service")), 10000);
            });
            
            const importPromise = import('@/integrations/supabase/client');
            
            // Race between the import and the timeout
            try {
              const result = await Promise.race([importPromise, timeoutPromise]) as { supabase: any };
              supabaseClient = result.supabase;
              
              if (!supabaseClient) {
                throw new Error("Failed to initialize Supabase client");
              }
              
              console.log("Supabase client imported successfully");
            } catch (raceError) {
              console.error("Race error during import:", raceError);
              throw new Error("Failed to load authentication service: " + (raceError.message || "unknown error"));
            }
          } catch (importError) {
            console.error("Failed to import Supabase client:", importError);
            
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying import (${retryCount}/${maxRetries})...`);
              // Add small delay before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            } else {
              throw new Error("Failed to load authentication service. Please try again.");
            }
          }
        }
        
        // If we have the client, attempt to sign in
        console.log("Signing in with credentials");
        const { data, error } = await supabaseClient.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (error) {
          console.error("Login error:", error);
          errorDiv.textContent = error.message || "Login failed";
          errorDiv.style.display = "block";
          submitBtn.innerHTML = 'LOG IN';
          submitBtn.removeAttribute('disabled');
          return;
        }
        
        console.log("Login successful", data);
        
        // Store the session data for immediate use
        try {
          localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        } catch (storageError) {
          console.warn("Could not store session token:", storageError);
          // Continue despite this error
        }
        
        // Remove modal before redirect and restore body overflow
        const modal = document.getElementById('direct-login-modal');
        if (modal) {
          document.body.removeChild(modal);
          document.body.style.overflow = originalBodyOverflow;
        }
        
        // Get redirect path from session storage if it exists
        const redirectPath = sessionStorage.getItem('redirect_after_login');
        
        // Safari-specific fix: use window.location.replace with a timestamp to prevent caching issues
        if (redirectPath) {
          console.log("Redirecting to stored path:", redirectPath);
          sessionStorage.removeItem('redirect_after_login');
          window.location.replace(redirectPath + (redirectPath.includes('?') ? '&' : '?') + 't=' + Date.now());
        } else {
          console.log("Redirecting to discover page");
          window.location.replace('/discover?t=' + Date.now());
        }
        
        // Break out of the retry loop on success
        break;
        
      } catch (err) {
        console.error("Login exception:", err);
        
        // Only retry on network or loading errors
        if (retryCount < maxRetries && 
            (err.message?.includes('network') || 
             err.message?.includes('load') || 
             err.message?.includes('timeout') ||
             err.message?.includes('import'))) {
          retryCount++;
          console.log(`Retrying login (${retryCount}/${maxRetries})...`);
          // Add small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Show friendly error message
          errorDiv.textContent = err.message || "An unexpected error occurred. Please try again.";
          errorDiv.style.display = "block";
          submitBtn.innerHTML = 'LOG IN';
          submitBtn.removeAttribute('disabled');
          break;
        }
      }
    }
    
    // If we've exhausted retries, show a friendly message
    if (retryCount > maxRetries) {
      errorDiv.textContent = "Connection issue detected. Please try again.";
      errorDiv.style.display = "block";
      submitBtn.innerHTML = 'LOG IN';
      submitBtn.removeAttribute('disabled');
    }
  };
  
  // Focus the email input
  setTimeout(() => {
    const emailInput = document.getElementById('direct-login-email') as HTMLInputElement;
    if (emailInput) {
      emailInput.focus();
    }
  }, 100);
  
  // Add click handler to close modal when clicking outside
  const modal = document.getElementById('direct-login-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        document.body.removeChild(modal);
        document.body.style.overflow = originalBodyOverflow;
      }
    });
  }
  
  // Add escape key handler
  const escHandler = function(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('direct-login-modal');
      if (modal && document.body.contains(modal)) {
        document.body.removeChild(modal);
        document.body.style.overflow = originalBodyOverflow;
        document.removeEventListener('keydown', escHandler);
      }
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Direct signup modal function
export function showDirectSignupModal(event?: React.MouseEvent) {
  console.log("showDirectSignupModal utility function started");
  
  // Prevent any event bubbling
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Check if modal already exists
  if (document.getElementById('direct-signup-modal')) {
    console.log("Signup modal already exists, not creating a new one");
    return;
  }
  
  // Create a full HTML modal with inline script
  const modalHtml = `
    <div id="direct-signup-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;">
      <div id="direct-signup-content" style="background-color: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: relative;">
        <button 
          id="direct-signup-close" 
          style="position: absolute; top: 12px; right: 12px; font-size: 24px; border: none; background: none; cursor: pointer; color: #718096;"
          onclick="document.body.removeChild(document.getElementById('direct-signup-modal'))"
        >×</button>
        
        <div style="margin-bottom: 16px; text-align: center;">
          <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #333;">
            Create your Lokaa account
          </h2>
        </div>
        
        <div id="direct-signup-error" style="color: #e53e3e; margin-bottom: 1rem; font-size: 0.875rem; display: none;"></div>
        
        <div style="margin-bottom: 1rem;">
          <input 
            type="text" 
            id="direct-signup-firstName" 
            placeholder="First name" 
            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;"
            required
          />
        </div>
        
        <div style="margin-bottom: 1rem;">
          <input 
            type="text" 
            id="direct-signup-lastName" 
            placeholder="Last name" 
            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;"
            required
          />
        </div>
        
        <div style="margin-bottom: 1rem;">
          <input 
            type="email" 
            id="direct-signup-email" 
            placeholder="Email" 
            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;"
            required
          />
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <input 
            type="password" 
            id="direct-signup-password" 
            placeholder="Password" 
            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;"
            required
          />
        </div>
        
        <button 
          id="direct-signup-submit"
          style="width: 100%; padding: 0.75rem; background-color: #0d9488; color: white; border: none; border-radius: 9999px; font-weight: 500; cursor: pointer; margin-bottom: 1rem;"
          onclick="handleDirectSignup()"
        >
          SIGN UP
        </button>
        
        <div style="text-align: center; font-size: 0.75rem; color: #718096; margin-bottom: 1rem;">
          By signing up, you accept our <a href="/terms" style="color: #0d9488;">terms</a> and <a href="/privacy" style="color: #0d9488;">privacy policy</a>.
        </div>

        <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 0.875rem; color: #4a5568;">
            Already have an account? 
            <a 
              href="#" 
              style="color: #0d9488; text-decoration: none; font-weight: 500;"
              onclick="event.preventDefault(); document.body.removeChild(document.getElementById('direct-signup-modal')); window.showDirectLoginModal(); return false;"
            >Log in</a>
          </p>
        </div>
      </div>
    </div>
  `;
  
  // Inject the modal HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHtml;
  document.body.appendChild(tempDiv.firstElementChild);
  
  // Now add the signup function directly to window
  // @ts-ignore
  window.handleDirectSignup = async function() {
    console.log("Direct signup handler called");
    
    const firstNameInput = document.getElementById('direct-signup-firstName') as HTMLInputElement;
    const lastNameInput = document.getElementById('direct-signup-lastName') as HTMLInputElement;
    const emailInput = document.getElementById('direct-signup-email') as HTMLInputElement;
    const passwordInput = document.getElementById('direct-signup-password') as HTMLInputElement;
    const errorDiv = document.getElementById('direct-signup-error');
    const submitBtn = document.getElementById('direct-signup-submit') as HTMLButtonElement;
    
    if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput || !errorDiv || !submitBtn) {
      console.error("Signup form elements not found");
      return;
    }
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validate inputs
    if (!firstName) {
      errorDiv.textContent = "First name is required";
      errorDiv.style.display = "block";
      return;
    }
    
    if (!lastName) {
      errorDiv.textContent = "Last name is required";
      errorDiv.style.display = "block";
      return;
    }
    
    if (!email) {
      errorDiv.textContent = "Email is required";
      errorDiv.style.display = "block";
      return;
    }
    
    if (!password) {
      errorDiv.textContent = "Password is required";
      errorDiv.style.display = "block";
      return;
    }
    
    if (password.length < 6) {
      errorDiv.textContent = "Password must be at least 6 characters";
      errorDiv.style.display = "block";
      return;
    }
    
    console.log("Attempting signup with email:", email);
    
    try {
      // Show loading state
      submitBtn.innerHTML = 'Signing up...';
      submitBtn.setAttribute('disabled', 'true');
      
      // Clear previous errors
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      
      // Import the supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Sign up with email and password
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim()
          }
        }
      });
      
      if (error) {
        console.error("Signup error:", error);
        errorDiv.textContent = error.message || "Sign up failed";
        errorDiv.style.display = "block";
        submitBtn.innerHTML = 'SIGN UP';
        submitBtn.removeAttribute('disabled');
      } else {
        console.log("Signup successful", data);
        
        // Remove modal before redirect
        const modal = document.getElementById('direct-signup-modal');
        if (modal) document.body.removeChild(modal);
        
        // Redirect to discover page
        window.location.href = '/discover';
      }
    } catch (err) {
      console.error("Signup exception:", err);
      errorDiv.textContent = "An unexpected error occurred";
      errorDiv.style.display = "block";
      submitBtn.innerHTML = 'SIGN UP';
      submitBtn.removeAttribute('disabled');
    }
  };
  
  // Focus the first name input
  setTimeout(() => {
    const firstNameInput = document.getElementById('direct-signup-firstName') as HTMLInputElement;
    if (firstNameInput) {
      firstNameInput.focus();
    }
  }, 100);
  
  // Add click handler to close modal when clicking outside
  const modal = document.getElementById('direct-signup-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  // Add escape key handler
  const escHandler = function(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('direct-signup-modal');
      if (modal && document.body.contains(modal)) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escHandler);
      }
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Simple forgot password modal
export function showDirectForgotPasswordModal(event?: React.MouseEvent) {
  console.log("showDirectForgotPasswordModal utility function started");
  
  // Prevent any event bubbling
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Check if modal already exists
  if (document.getElementById('direct-forgot-modal')) {
    console.log("Forgot password modal already exists, not creating a new one");
    return;
  }
  
  // Create a full HTML modal with inline script
  const modalHtml = `
    <div id="direct-forgot-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;">
      <div id="direct-forgot-content" style="background-color: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: relative;">
        <button 
          id="direct-forgot-close" 
          style="position: absolute; top: 12px; right: 12px; font-size: 24px; border: none; background: none; cursor: pointer; color: #718096;"
          onclick="document.body.removeChild(document.getElementById('direct-forgot-modal'))"
        >×</button>
        
        <div style="margin-bottom: 16px; text-align: center;">
          <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #333;">
            Reset Password
          </h2>
        </div>
        
        <div id="direct-forgot-message" style="color: #38a169; margin-bottom: 1rem; font-size: 0.875rem; display: none;"></div>
        <div id="direct-forgot-error" style="color: #e53e3e; margin-bottom: 1rem; font-size: 0.875rem; display: none;"></div>
        
        <div style="margin-bottom: 1rem;">
          <input 
            type="email" 
            id="direct-forgot-email" 
            placeholder="Enter your email" 
            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;"
            required
          />
        </div>
        
        <button 
          id="direct-forgot-submit"
          style="width: 100%; padding: 0.75rem; background-color: #0d9488; color: white; border: none; border-radius: 9999px; font-weight: 500; cursor: pointer; margin-bottom: 1rem;"
          onclick="handleForgotPassword()"
        >
          SEND RESET LINK
        </button>

        <div style="text-align: center; margin-top: 1rem;">
          <a 
            href="#" 
            style="color: #0d9488; text-decoration: none; font-size: 0.875rem;"
            onclick="event.preventDefault(); document.body.removeChild(document.getElementById('direct-forgot-modal')); window.showDirectLoginModal(); return false;"
          >Back to login</a>
        </div>
      </div>
    </div>
  `;
  
  // Inject the modal HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHtml;
  document.body.appendChild(tempDiv.firstElementChild);
  
  // Now add the forgot password function directly to window
  // @ts-ignore
  window.handleForgotPassword = async function() {
    console.log("Forgot password handler called");
    
    const emailInput = document.getElementById('direct-forgot-email') as HTMLInputElement;
    const messageDiv = document.getElementById('direct-forgot-message');
    const errorDiv = document.getElementById('direct-forgot-error');
    const submitBtn = document.getElementById('direct-forgot-submit') as HTMLButtonElement;
    
    if (!emailInput || !messageDiv || !errorDiv || !submitBtn) {
      console.error("Forgot password form elements not found");
      return;
    }
    
    const email = emailInput.value.trim();
    
    // Validate email
    if (!email) {
      errorDiv.textContent = "Please enter your email";
      errorDiv.style.display = "block";
      messageDiv.style.display = "none";
      return;
    }
    
    console.log("Sending password reset for email:", email);
    
    try {
      // Show loading state
      submitBtn.innerHTML = 'Sending...';
      submitBtn.setAttribute('disabled', 'true');
      
      // Clear previous messages
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      messageDiv.textContent = '';
      messageDiv.style.display = 'none';
      
      // Import the supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error("Password reset error:", error);
        errorDiv.textContent = error.message || "Failed to send reset link";
        errorDiv.style.display = "block";
      } else {
        console.log("Password reset email sent");
        messageDiv.textContent = "Check your email for a password reset link";
        messageDiv.style.display = "block";
        emailInput.value = '';
      }
    } catch (err) {
      console.error("Password reset exception:", err);
      errorDiv.textContent = "An unexpected error occurred";
      errorDiv.style.display = "block";
    } finally {
      submitBtn.innerHTML = 'SEND RESET LINK';
      submitBtn.removeAttribute('disabled');
    }
  };
  
  // Focus the email input
  setTimeout(() => {
    const emailInput = document.getElementById('direct-forgot-email') as HTMLInputElement;
    if (emailInput) {
      emailInput.focus();
    }
  }, 100);
  
  // Add click handler to close modal when clicking outside
  const modal = document.getElementById('direct-forgot-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  // Add escape key handler
  const escHandler = function(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('direct-forgot-modal');
      if (modal && document.body.contains(modal)) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escHandler);
      }
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Expose the functions globally on window for use anywhere
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.showDirectLoginModal = showDirectLoginModal;
  // @ts-ignore
  window.showDirectSignupModal = showDirectSignupModal;
  // @ts-ignore
  window.showDirectForgotPasswordModal = showDirectForgotPasswordModal;
  console.log("Auth modal utilities exposed on window object");
} 