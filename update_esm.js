import fs from 'fs'; const file = 'src/pages/Login.tsx'; let content = fs.readFileSync(file, 'utf8'); content = content.replace('console.log("Login successful, redirecting to:", from);', `console.log("Login successful, redirecting to:", from);
        // Manually redirect non-test users (test user handled in AuthContext)
        if (data.email !== "francischukwuma706@gmail.com") {
          setTimeout(() => {
            navigate(from, { replace: true });
          }, 100);
        }`); fs.writeFileSync(file, content); console.log('Updated Login.tsx');
