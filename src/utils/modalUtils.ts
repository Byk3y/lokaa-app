// Modal utility functions

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
    console.log("Modal already exists, not creating a new one");
    return;
  }
  
  // Create a full HTML modal with inline script
  const modalHtml = `
    <div id="direct-login-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;">
      <div id="direct-login-content" style="background-color: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: relative;">
        <button 
          id="direct-login-close" 
          style="position: absolute; top: 12px; right: 12px; font-size: 24px; border: none; background: none; cursor: pointer; color: #718096;"
          onclick="document.body.removeChild(document.getElementById('direct-login-modal'))"
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
            onclick="event.preventDefault(); document.body.removeChild(document.getElementById('direct-login-modal')); window.showDirectForgotPasswordModal(); return false;"
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
              onclick="event.preventDefault(); document.body.removeChild(document.getElementById('direct-login-modal')); window.showDirectSignupModal(); return false;"
            >Sign up for free</a>
          </p>
        </div>
      </div>
    </div>
  `;
  
  // Inject the modal HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHtml;
  document.body.appendChild(tempDiv.firstElementChild);
  
  // Now add the login function directly to window
  // @ts-expect-error Property 'handleDirectLogin' does not exist on type 'Window & typeof globalThis'.
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
    
    try {
      // Show loading state
      submitBtn.innerHTML = 'Logging in...';
      submitBtn.setAttribute('disabled', 'true');
      
      // Clear previous errors
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      
      // Import the supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error("Login error:", error);
        errorDiv.textContent = error.message || "Login failed";
        errorDiv.style.display = "block";
        submitBtn.innerHTML = 'LOG IN';
        submitBtn.removeAttribute('disabled');
      } else {
        console.log("Login successful", data);
        
        // Remove modal before redirect
        const modal = document.getElementById('direct-login-modal');
        if (modal) document.body.removeChild(modal);
        
        // Redirect to discover page
        window.location.href = '/discover';
      }
    } catch (err) {
      console.error("Login exception:", err);
      errorDiv.textContent = "An unexpected error occurred";
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
      }
    });
  }
  
  // Add escape key handler
  const escHandler = function(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('direct-login-modal');
      if (modal && document.body.contains(modal)) {
        document.body.removeChild(modal);
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
    console.log("Modal already exists, not creating a new one");
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
  // @ts-expect-error Property 'handleDirectSignup' does not exist on type 'Window & typeof globalThis'.
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
    console.log("Modal already exists, not creating a new one");
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
  // @ts-expect-error Property 'handleForgotPassword' does not exist on type 'Window & typeof globalThis'.
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

// Make the modal functions available on the window object for global access
// This is generally discouraged in favor of React context or component props,
// but kept for now to maintain existing functionality across different parts of the app.
window.showDirectLoginModal = showDirectLoginModal;
window.showDirectSignupModal = showDirectSignupModal;
window.showDirectForgotPasswordModal = showDirectForgotPasswordModal;

// Expose the functions globally on window for use anywhere
if (typeof window !== 'undefined') {
  console.log("Modal utilities exposed on window object");
}

export function showGlobalAlert(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const detail = { message, type };
  document.dispatchEvent(new CustomEvent('global-alert', { detail }));
}

export function showOldStyleLoginModal(callback?: () => void) {
  console.log("Attempting to show old style login modal");
  // @ts-expect-error Potentially legacy function call
  if (window.showLegacyLoginModal) {
    // @ts-expect-error Potentially legacy function call
    window.showLegacyLoginModal(callback);
  } else if (window.showDirectLoginModal) {
    // @ts-expect-error Potentially legacy function call
    window.showDirectLoginModal(undefined, callback);
  } else {
    console.warn("No global login modal function found (showLegacyLoginModal or showDirectLoginModal)");
    // Fallback to direct navigation or a more robust solution
    // navigate('/login'); // Assuming navigate is available or passed in
  }
}

export function showOldStyleSignupModal(callback?: () => void) {
  console.log("Attempting to show old style signup modal");
  // @ts-expect-error Potentially legacy function call
  if (window.showLegacySignupModal) {
    // @ts-expect-error Potentially legacy function call
    window.showLegacySignupModal(callback);
  } else if (window.showDirectSignupModal) {
    // @ts-expect-error Potentially legacy function call
    window.showDirectSignupModal(undefined, callback);
  } else {
    console.warn("No global signup modal function found (showLegacySignupModal or showDirectSignupModal)");
  }
} 