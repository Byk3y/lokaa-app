// Settings Validation Test Script
(function() {
  class SettingsValidationTest {
    constructor() {
      this.testSuites = [];
      // Get validation functions from the hooks
      const { validateData } = window.__lokaa_validation_hooks || {};
      this.validateData = validateData;
    }

    static getInstance() {
      if (!SettingsValidationTest.instance) {
        SettingsValidationTest.instance = new SettingsValidationTest();
      }
      return SettingsValidationTest.instance;
    }

    async testGeneralSettings() {
      const results = [];

      // Test valid data
      try {
        const validData = {
          name: "Test Space",
          description: "A test space description",
          subdomain: "test-space",
          is_private: false,
          support_email: "test@example.com",
          owner_id: "123e4567-e89b-12d3-a456-426614174000",
          icon_image: "https://example.com/icon.png",
          cover_image: "https://example.com/cover.png"
        };
        const { isValid, errors } = await this.validateData('general', validData);
        results.push({ 
          name: "Valid General Settings", 
          passed: isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Valid General Settings", passed: false, errors: [error.message] });
      }

      // Test invalid data
      try {
        const invalidData = {
          name: "a", // Too short
          description: "x".repeat(200), // Too long
          subdomain: "INVALID", // Invalid format
          is_private: "not-boolean", // Invalid type
          support_email: "invalid-email",
          owner_id: "not-uuid",
          icon_image: "not-url",
          cover_image: 123 // Invalid type
        };
        const { isValid, errors } = await this.validateData('general', invalidData);
        results.push({ 
          name: "Invalid General Settings", 
          passed: !isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Invalid General Settings", passed: true });
      }

      return { name: "General Settings", results };
    }

    async testAboutSettings() {
      const results = [];

      // Test valid data
      try {
        const validData = {
          about_description: "A detailed about description",
          short_description: "A short description",
          intro_media_type: "video",
          intro_media_url: "https://example.com/video.mp4",
          icon_image: "https://example.com/icon.png",
          cover_image: "https://example.com/cover.png"
        };
        const { isValid, errors } = await this.validateData('about', validData);
        results.push({ 
          name: "Valid About Settings", 
          passed: isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Valid About Settings", passed: false, errors: [error.message] });
      }

      // Test invalid data
      try {
        const invalidData = {
          about_description: "x".repeat(60000), // Too long
          intro_media_type: "invalid", // Invalid enum
          intro_media_url: "not-url"
        };
        const { isValid, errors } = await this.validateData('about', invalidData);
        results.push({ 
          name: "Invalid About Settings", 
          passed: !isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Invalid About Settings", passed: true });
      }

      return { name: "About Settings", results };
    }

    async testRulesSettings() {
      const results = [];

      // Test valid data
      try {
        const validData = {
          rules_list: [
            { id: "123e4567-e89b-12d3-a456-426614174000", text: "Rule 1" },
            { id: "223e4567-e89b-12d3-a456-426614174000", text: "Rule 2" }
          ]
        };
        const { isValid, errors } = await this.validateData('rules', validData);
        results.push({ 
          name: "Valid Rules Settings", 
          passed: isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Valid Rules Settings", passed: false, errors: [error.message] });
      }

      // Test invalid data
      try {
        const invalidData = {
          rules_list: [
            { id: "not-uuid", text: "" }, // Invalid UUID and empty text
            { text: "Missing ID" } // Missing ID
          ]
        };
        const { isValid, errors } = await this.validateData('rules', invalidData);
        results.push({ 
          name: "Invalid Rules Settings", 
          passed: !isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Invalid Rules Settings", passed: true });
      }

      return { name: "Rules Settings", results };
    }

    async testCategoriesSettings() {
      const results = [];

      // Test valid data
      try {
        const validData = {
          categories: [
            { id: "123e4567-e89b-12d3-a456-426614174000", name: "Category 1", icon: "🎯" },
            { id: "223e4567-e89b-12d3-a456-426614174000", name: "Category 2", icon: "📚" }
          ]
        };
        const { isValid, errors } = await this.validateData('categories', validData);
        results.push({ 
          name: "Valid Categories Settings", 
          passed: isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Valid Categories Settings", passed: false, errors: [error.message] });
      }

      // Test invalid data
      try {
        const invalidData = {
          categories: [
            { id: "not-uuid", name: "a", icon: "too-long" }, // Invalid UUID, short name, long icon
            { name: "Missing ID and Icon" } // Missing fields
          ]
        };
        const { isValid, errors } = await this.validateData('categories', invalidData);
        results.push({ 
          name: "Invalid Categories Settings", 
          passed: !isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Invalid Categories Settings", passed: true });
      }

      return { name: "Categories Settings", results };
    }

    async testPricingSettings() {
      const results = [];

      // Test valid data
      try {
        const validData = {
          pricing_type: "paid",
          price_per_month: 10,
          feature_7_day_trial_enabled: true
        };
        const { isValid, errors } = await this.validateData('pricing', validData);
        results.push({ 
          name: "Valid Pricing Settings", 
          passed: isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Valid Pricing Settings", passed: false, errors: [error.message] });
      }

      // Test invalid data
      try {
        const invalidData = {
          pricing_type: "invalid",
          price_per_month: 0, // Too low
          feature_7_day_trial_enabled: "not-boolean"
        };
        const { isValid, errors } = await this.validateData('pricing', invalidData);
        results.push({ 
          name: "Invalid Pricing Settings", 
          passed: !isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Invalid Pricing Settings", passed: true });
      }

      return { name: "Pricing Settings", results };
    }

    async testTabsSettings() {
      const results = [];

      // Test valid data
      try {
        const validData = {
          feature_classroom_enabled: true,
          feature_calendar_enabled: false,
          feature_map_enabled: true
        };
        const { isValid, errors } = await this.validateData('tabs', validData);
        results.push({ 
          name: "Valid Tabs Settings", 
          passed: isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Valid Tabs Settings", passed: false, errors: [error.message] });
      }

      // Test invalid data
      try {
        const invalidData = {
          feature_classroom_enabled: "not-boolean",
          feature_calendar_enabled: 1,
          feature_map_enabled: "true"
        };
        const { isValid, errors } = await this.validateData('tabs', invalidData);
        results.push({ 
          name: "Invalid Tabs Settings", 
          passed: !isValid,
          errors: errors ? Object.values(errors).flat() : undefined
        });
      } catch (error) {
        results.push({ name: "Invalid Tabs Settings", passed: true });
      }

      return { name: "Tabs Settings", results };
    }

    async runAllTests() {
      if (!this.validateData) {
        console.error("❌ Validation functions not found. Make sure you're on a settings page and validation hooks are loaded.");
        return;
      }

      console.log("🧪 Starting Settings Validation Tests...");
      
      this.testSuites = await Promise.all([
        this.testGeneralSettings(),
        this.testAboutSettings(),
        this.testRulesSettings(),
        this.testCategoriesSettings(),
        this.testPricingSettings(),
        this.testTabsSettings()
      ]);

      this.printResults();
    }

    printResults() {
      console.log("\n📊 Settings Validation Test Results:\n");

      let totalTests = 0;
      let passedTests = 0;

      this.testSuites.forEach(suite => {
        console.log(`\n${suite.name}:`);
        suite.results.forEach(result => {
          totalTests++;
          if (result.passed) passedTests++;
          const status = result.passed ? "✅" : "❌";
          console.log(`  ${status} ${result.name}`);
          if (result.errors) {
            result.errors.forEach(error => console.log(`    - ${error}`));
          }
        });
      });

      const successRate = (passedTests / totalTests * 100).toFixed(1);
      console.log(`\n📈 Overall Results: ${passedTests}/${totalTests} tests passed (${successRate}%)\n`);
    }

    static runQuickTest() {
      const instance = SettingsValidationTest.getInstance();
      instance.runAllTests();
    }
  }

  // Make test runner available globally
  window.settingsValidationTest = {
    runAllTests: SettingsValidationTest.runQuickTest
  };

  // Run tests automatically when script loads
  console.log("Settings validation test script loaded. Run tests with window.settingsValidationTest.runAllTests()");
})(); 