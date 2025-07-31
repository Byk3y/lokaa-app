# Lokaa Affiliate Program Implementation Roadmap

## Executive Brief

**Current State** (Updated after Database Audit): Lokaa has excellent foundational infrastructure including:
- ✅ User wallet system (`users.wallet_balance`)
- ✅ Complete referral tracking (`referrals` table with `reward_amount`, `is_paid`)
- ✅ Space/course pricing infrastructure with currency support (NGN/USD)
- ✅ RLS security across all tables
- ✅ Audit trail patterns (`membership_history`)
- ❌ Missing: Transaction logging, payout processing, payment provider integration

**Goal**: Implement a comprehensive affiliate program leveraging existing infrastructure, starting with Paystack payouts (NGN) and designed for seamless migration to Stripe Connect (USD).

**Key Design Principles**:
- Leverage existing wallet and referral systems
- Provider-agnostic schema with abstracted payout services
- 30-day eligibility buffer for payout security
- Comprehensive audit trails for financial compliance
- Extend existing tables rather than rebuild

**Timeline**: 6 phases over 8-10 weeks (attribution-first approach), with each phase delivering working functionality.

---

## Phase 0: Referral Attribution System (PRE-PAYMENT) - NEW PRIORITY
**Duration**: 1-2 weeks  
**Objective**: Capture referral attribution before payment infrastructure to avoid losing historical data

### Objectives
- [ ] Design referral link system for lokaa.app domain
- [ ] Extend existing referrals table with attribution metadata
- [ ] Create referral link generation and tracking
- [ ] Implement attribution middleware for lokaa.app routes
- [ ] Track space/course conversions via referral links
- [ ] Calculate "pending" commission amounts based on current pricing
- [ ] Build basic affiliate dashboard showing potential earnings

### Deliverables
- [ ] **Referral Link System**: Clean URLs using lokaa.app domain structure
- [ ] **Attribution Tracking**: 30-day attribution window across entire platform
- [ ] **Conversion Tracking**: Space joins and course enrollments via referrals
- [ ] **Pending Commissions**: Calculate earnings based on current pricing
- [ ] **Basic Dashboard**: Show potential earnings to motivate early adopters

### Key Files/Tables Impacted
```
Database Tables (Extended):
- referrals (add referral_source, conversion_type, conversion_id, attribution_date, commission_rate, pending_payment)

Database Tables (New):
- referral_links (link_code, user_id, target_type, target_id, clicks, conversions)

Files:
- src/components/referral/ReferralLanding.tsx (new)
- src/components/referral/ReferralRedirect.tsx (new)
- src/hooks/useReferralAttribution.ts (new)
- src/utils/referralTracking.ts (new)
- src/routes/LazyRoutes.tsx (add /r/:code routes)
- src/types/referral.ts (new)
```

### Referral Link Structure for lokaa.app
```
General signup: https://lokaa.app/r/ABC123
Specific space: https://lokaa.app/r/ABC123/space/web-development
Specific course: https://lokaa.app/r/ABC123/course/react-masterclass
```

### Documentation to Consult
- [URL Attribution Best Practices](https://developers.google.com/analytics/devguides/collection/gtagjs/campaigns)
- [Cookie Attribution Strategies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

### Dependencies/Blockers
- [ ] lokaa.app domain DNS configuration
- [ ] Router middleware implementation for /r/ routes
- [ ] Attribution cookie strategy across lokaa.app
- [ ] Commission rate decisions for different conversion types

### Acceptance Checklist
- [ ] Referral links generating correctly for all target types
- [ ] Attribution tracking working across lokaa.app domain
- [ ] Conversion tracking capturing space/course joins
- [ ] Pending commission calculations accurate
- [ ] Basic affiliate dashboard showing potential earnings
- [ ] 30-day attribution window enforced consistently
- [ ] All referral data stored for future payment integration

---

## Phase 1: Payment Infrastructure Foundation (REVISED) 
**Duration**: 2-3 weeks  
**Objective**: Implement payment processing and connect to existing referral attribution

### Objectives (Updated)
- [x] ~~Complete comprehensive audit of existing payment infrastructure~~ (COMPLETED)
- [ ] Implement Paystack integration for space/course subscriptions
- [ ] Create payment webhook handlers for successful transactions
- [ ] Build subscription management system
- [ ] Connect payment events to existing referral attribution system
- [ ] Create financial audit tables (transactions, payouts)
- [ ] Establish RLS policies for financial data protection

### Deliverables
- [ ] **Paystack Integration**: Complete NGN subscription processing for spaces/courses
- [ ] **Payment Webhooks**: Handlers connecting successful payments to referral system
- [ ] **Financial Tables**: Transaction logging and payout processing infrastructure
- [ ] **Subscription System**: Space/course payment management with existing pricing
- [ ] **Attribution Bridge**: Connect payment events to Phase 0 referral tracking
- [ ] **Security Framework**: RLS policies for all financial data

### Key Files/Tables Impacted (REVISED)
```
Database Tables (New - MINIMAL):
- transactions (financial audit trail)
- payouts (payout processing)

Existing Tables (Enhanced):
- referrals (add commission_amount, commission_currency, commission_status, eligible_date, payout_id)
- users (add payout_bank_details jsonb, affiliate_enabled boolean)
- spaces (add commission_rate numeric, affiliate_enabled boolean)

Files:
- src/types/affiliate.ts (new)
- src/types/database.types.ts (update with existing + new tables)
- supabase/migrations/ (3 migration files: transactions, payouts, referrals_extension)
- .env files (Paystack keys)
```

### Documentation to Consult
- [Paystack Transfer Recipients API](https://paystack.com/docs/transfers/recipients)
- [Paystack Transfer API](https://paystack.com/docs/transfers/)
- [Stripe Connect Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

### Dependencies/Blockers
- [ ] Paystack business account verification
- [ ] Nigerian banking compliance requirements
- [ ] Supabase project access and migration permissions
- [ ] Environment variable management strategy
- [ ] Legal review of affiliate terms and conditions

### Acceptance Checklist
- [ ] All affiliate database tables created with proper relationships
- [ ] RLS policies implemented for all financial tables
- [ ] Paystack webhook endpoints configured and tested
- [ ] Environment variables securely configured
- [ ] Database migrations tested in staging environment
- [ ] Schema documentation completed
- [ ] Basic affiliate registration flow functional

---

## Phase 2: Commission Bridge & Processing (REVISED)
**Duration**: 1-2 weeks (accelerated)  
**Objective**: Convert tracked referrals to actual commissions when payments occur

### Objectives (Updated)
- [ ] Build commission calculation engine for successful payments
- [ ] Convert Phase 0 "pending" referrals to actual commissions
- [ ] Implement wallet_balance updates for affiliate earnings
- [ ] Create commission processing workflow using payment webhooks
- [ ] Activate historical commission calculations for all tracked referrals

### Deliverables
- [ ] **Commission Engine**: Convert referral attribution to actual commissions
- [ ] **Payment Bridge**: Connect Phase 1 webhooks to Phase 0 referral tracking
- [ ] **Wallet Integration**: Credit affiliate earnings to existing wallet_balance
- [ ] **Historical Processing**: Activate commissions for all previous referrals
- [ ] **Commission Dashboard**: Real-time earnings display for affiliates

### Key Files/Tables Impacted
```
New Files:
- src/services/PayoutService.ts
- src/services/providers/PaystackPayoutProvider.ts
- src/services/providers/StripePayoutProvider.ts (stub)
- src/utils/eligibilityCalculator.ts
- src/hooks/usePayoutEligibility.ts
- supabase/edge-functions/process-payouts/
- supabase/edge-functions/payout-webhooks/

Modified Files:
- src/types/database.types.ts
- src/contexts/SupabaseContext.tsx
```

### Documentation to Consult
- [Paystack Transfer Recipients API](https://paystack.com/docs/transfers/recipients)
- [Paystack Webhooks](https://paystack.com/docs/webhooks/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Edge Function Scheduling](https://supabase.com/docs/guides/functions/schedule-functions)

### Dependencies/Blockers
- [ ] Paystack transfer recipient verification process
- [ ] Bank account validation requirements
- [ ] Webhook endpoint SSL certificates
- [ ] Edge Function deployment permissions
- [ ] Financial compliance review

### Acceptance Checklist
- [ ] PayoutService interface implemented with provider switching capability
- [ ] Paystack payouts working end-to-end in test environment
- [ ] 30-day eligibility buffer enforced in all payout calculations
- [ ] Transaction audit trail capturing all financial events
- [ ] Webhook handlers processing payment confirmations
- [ ] Admin approval workflow for large payouts functional
- [ ] Error handling and retry logic for failed payouts implemented
- [ ] Payout status tracking and user notifications working

---

## Phase 3: Affiliate Payout System (REVISED)
**Duration**: 2-3 weeks  
**Objective**: Implement actual payout processing for affiliate earnings

### Objectives (Updated)
- [ ] Implement PayoutService abstraction layer
- [ ] Build Paystack payout processing for NGN withdrawals
- [ ] Create 30-day eligibility buffer for commission payouts
- [ ] Develop payout request and approval workflow
- [ ] Implement fraud detection and payout validation

### Deliverables
- [ ] **PayoutService**: Provider-agnostic payout processing abstraction
- [ ] **Paystack Integration**: Complete NGN payout transfers to bank accounts
- [ ] **Eligibility System**: 30-day buffer before payouts become available
- [ ] **Payout Dashboard**: Request management and approval interface
- [ ] **Security Framework**: Fraud detection and validation systems

### Key Files/Tables Impacted
```
New Files:
- src/services/ReferralTracker.ts
- src/services/CommissionCalculator.ts
- src/hooks/useAffiliateAnalytics.ts
- src/components/affiliate/AffiliateTracker.tsx
- src/utils/fraudDetection.ts
- supabase/edge-functions/calculate-commissions/
- supabase/edge-functions/process-referrals/

Modified Tables:
- commissions (add dispute_status, adjustment_reason)
- affiliate_referrals (add attribution_window, conversion_data)
- users (add referral_code, affiliate_performance_data)

New Tables:
- commission_adjustments
- affiliate_analytics_snapshots
- fraud_alerts
```

### Documentation to Consult
- [Attribution Window Best Practices](https://blog.affiliatewp.com/attribution-windows/)
- [Commission Structure Examples](https://www.impact.com/blog/commission-structures-guide/)
- [Fraud Detection in Affiliate Marketing](https://www.partnerfleet.com/affiliate-fraud-detection/)

### Dependencies/Blockers
- [ ] Commission rate approval from business stakeholders
- [ ] Attribution window policy decisions
- [ ] Fraud detection thresholds and rules
- [ ] Analytics requirements specification
- [ ] Legal review of commission terms

### Acceptance Checklist
- [ ] Referral links generating and tracking conversions correctly
- [ ] Commission calculations accurate for all rate structures
- [ ] Attribution windows properly enforced
- [ ] Affiliate performance analytics displaying real-time data
- [ ] Dispute system allowing commission adjustments
- [ ] Basic fraud detection alerting on suspicious activity
- [ ] Commission accrual working with payout eligibility system
- [ ] Performance data updating in real-time

---

## Phase 4: Analytics & Advanced Features (REVISED)
**Duration**: 2-3 weeks  
**Objective**: Build comprehensive analytics and advanced affiliate features

### Objectives (Updated)
- [ ] Build comprehensive affiliate performance analytics
- [ ] Implement advanced referral link management
- [ ] Create multi-tier commission structures
- [ ] Develop fraud detection and dispute resolution
- [ ] Add advanced reporting and insights for affiliates

### Deliverables
- [ ] **Analytics Dashboard**: Comprehensive performance metrics and trends
- [ ] **Advanced Link Management**: Bulk generation, A/B testing, UTM tracking
- [ ] **Multi-Tier Commissions**: Performance-based and volume bonus structures
- [ ] **Fraud Detection**: Automated suspicious activity monitoring
- [ ] **Dispute Resolution**: Commission adjustment and review workflow

### Key Files/Tables Impacted
```
New Files:
- src/pages/AffiliateDashboard.tsx
- src/pages/AffiliateOnboarding.tsx
- src/components/affiliate/EarningsChart.tsx
- src/components/affiliate/PayoutHistory.tsx
- src/components/affiliate/ReferralLinkManager.tsx
- src/components/affiliate/CommissionBreakdown.tsx
- src/hooks/useAffiliateEarnings.ts
- src/hooks/usePayoutHistory.ts

Modified Files (REVISED):
- src/pages/Earnings.tsx (enhance with real commission data from referrals table)
- src/components/layout/Navigation.tsx (add affiliate nav)
- src/routes/LazyRoutes.tsx (add affiliate routes)
- src/hooks/useAffiliateEarnings.ts (connect to existing referrals + new transactions)
```

### Documentation to Consult
- [Skool Affiliate Dashboard UX](https://www.skool.com/affiliates) (reference)
- [React Chart.js Integration](https://react-chartjs-2.js.org/)
- [shadcn/ui Data Tables](https://ui.shadcn.com/docs/components/data-table)

### Dependencies/Blockers
- [ ] UI/UX design approval for affiliate interfaces
- [ ] Branding guidelines for affiliate materials
- [ ] Mobile responsive design requirements
- [ ] Analytics visualization library selection
- [ ] User testing and feedback collection

### Acceptance Checklist
- [ ] Affiliate onboarding flow completed and tested
- [ ] Dashboard displaying accurate earnings and performance data
- [ ] Payout request system functional with status tracking
- [ ] Referral link generation and management working
- [ ] Mobile responsive design tested across devices
- [ ] Analytics charts displaying real-time affiliate data
- [ ] Commission breakdown showing detailed calculations
- [ ] User experience optimized based on testing feedback

---

## Phase 5: UI Enhancement & User Experience (REVISED)
**Duration**: 2 weeks  
**Objective**: Enhance existing UI components with full affiliate functionality

### Objectives (Updated)
- [ ] Enhance existing Earnings.tsx with complete affiliate data
- [ ] Build comprehensive affiliate dashboard and onboarding
- [ ] Implement payout request interface using existing patterns
- [ ] Create mobile-responsive affiliate features
- [ ] Add real-time notifications and status updates

### Deliverables
- [ ] **Enhanced Dashboard**: Complete affiliate earnings and performance overview
- [ ] **Onboarding Flow**: Seamless affiliate registration and setup process
- [ ] **Payout Interface**: Request management and history tracking
- [ ] **Mobile Experience**: Responsive design for all affiliate features
- [ ] **Notification System**: Real-time updates for earnings and payouts

---

## Phase 6: QA, Security Audit & Launch (REVISED)
**Duration**: 1-2 weeks (accelerated)  
**Objective**: Testing, security review, and production deployment leveraging existing patterns

### Objectives
- [ ] Complete end-to-end system testing
- [ ] Conduct security audit of financial systems
- [ ] Perform load testing and performance optimization
- [ ] Implement monitoring and alerting systems
- [ ] Prepare documentation and training materials

### Deliverables
- [ ] **Security Audit Report**: Comprehensive financial system security review
- [ ] **Performance Optimization**: System tuned for production load
- [ ] **Monitoring Dashboard**: Real-time system health and financial alerts
- [ ] **Documentation**: Complete admin and user guides
- [ ] **Production Deployment**: Staged rollout with monitoring

### Key Files/Tables Impacted
```
New Files:
- docs/affiliate-admin-guide.md
- docs/affiliate-user-guide.md
- docs/security-checklist.md
- supabase/edge-functions/monitoring-alerts/
- src/utils/performanceMonitoring.ts
- scripts/deployment-checklist.sh

Modified Files:
- All affiliate-related files (performance optimizations)
- Environment configurations (production settings)
- Netlify deployment settings
```

### Documentation to Consult
- [OWASP Financial Application Security](https://owasp.org/www-project-top-ten/)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Netlify Edge Functions Monitoring](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/)

### Dependencies/Blockers
- [ ] Security audit approval
- [ ] Production environment setup
- [ ] Monitoring tool integration
- [ ] Load testing environment preparation
- [ ] Launch communication strategy

### Acceptance Checklist
- [ ] All security vulnerabilities identified and resolved
- [ ] Load testing passed with acceptable performance metrics
- [ ] Financial transaction monitoring and alerting functional
- [ ] Documentation completed and reviewed
- [ ] Backup and disaster recovery procedures tested
- [ ] Production deployment successful with zero downtime
- [ ] User training materials distributed
- [ ] Launch metrics and KPIs tracking implemented

---

## UPDATED Implementation Schema & Architecture

### Key Schema Changes Based on Audit

#### 1. New Financial Tables (Minimal Addition)
```sql
-- TRANSACTIONS: Complete financial audit trail
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  type text CHECK (type IN ('wallet_credit', 'wallet_debit', 'commission_earned', 'payout_requested', 'payout_completed')) NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'NGN',
  reference_id uuid, -- referral_id, payout_id, etc.
  status text DEFAULT 'completed',
  provider text, -- 'paystack', 'stripe_connect', 'internal'
  external_transaction_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- PAYOUTS: Actual money transfer tracking  
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'NGN',
  provider text NOT NULL, -- 'paystack', 'stripe_connect'
  provider_transaction_id text,
  status text DEFAULT 'pending',
  bank_details jsonb, -- encrypted bank info
  eligible_date date, -- 30-day buffer
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### 2. Extended Existing Tables (Leverage Current Infrastructure)
```sql
-- EXTEND REFERRALS (instead of creating new commission table)
ALTER TABLE referrals ADD COLUMN commission_amount numeric(10,2) DEFAULT 0.00;
ALTER TABLE referrals ADD COLUMN commission_currency varchar(3) DEFAULT 'NGN';
ALTER TABLE referrals ADD COLUMN commission_status text DEFAULT 'pending'; -- pending, eligible, paid
ALTER TABLE referrals ADD COLUMN eligible_date date;
ALTER TABLE referrals ADD COLUMN payout_id uuid REFERENCES payouts(id);

-- EXTEND USERS (affiliate capabilities)
ALTER TABLE users ADD COLUMN payout_bank_details jsonb;
ALTER TABLE users ADD COLUMN affiliate_enabled boolean DEFAULT false;

-- EXTEND SPACES (commission configuration)
ALTER TABLE spaces ADD COLUMN commission_rate numeric(5,2) DEFAULT 10.00; -- percentage
ALTER TABLE spaces ADD COLUMN affiliate_enabled boolean DEFAULT false;
```

#### 3. Leverage Existing Infrastructure Advantages
```typescript
// Use existing wallet_balance for holding affiliate earnings
// Use existing RLS policies pattern for financial data security
// Use existing referrals table structure for commission tracking
// Use existing currency support (NGN/USD) from courses table

interface PayoutService {
  processPayoutRequest(request: PayoutRequest): Promise<PayoutResult>;
  getPayoutStatus(payoutId: string): Promise<PayoutStatus>;
  validateRecipient(recipient: PayoutRecipient): Promise<ValidationResult>;
  // Integrate with existing wallet_balance system
  transferFromWalletToPayout(userId: string, amount: number): Promise<void>;
}
```

#### 4. Enhanced 30-Day Eligibility Buffer (Using Existing Patterns)
- Commissions populate existing `referrals.reward_amount` immediately 
- New `commission_status` tracks: pending → eligible → paid
- Automated job moves eligible commissions after 30 days using existing job patterns
- Integrates with existing `users.wallet_balance` for immediate earnings visibility

---

## Optional Nice-to-Have Upgrades

### Multi-Tier Commission Structure
- Implement performance-based commission rates
- Volume-based bonuses and incentives
- Team/hierarchical commission sharing

### Advanced Fraud Detection
- Machine learning-based suspicious activity detection
- Velocity checks and pattern analysis
- Automated account flagging and review workflows

### International Expansion
- Multi-currency support beyond NGN/USD
- Regional payout provider integrations (EU, APAC)
- Tax reporting and compliance automation

### Advanced Analytics
- Predictive analytics for affiliate performance
- ROI optimization recommendations
- Cohort analysis and lifetime value tracking

---

## Risk Mitigation

### Financial Risks
- Implement daily reconciliation processes
- Set maximum payout limits with manual approval thresholds
- Maintain separate escrow accounts for affiliate funds

### Technical Risks
- Comprehensive backup and disaster recovery procedures
- Gradual rollout with feature flags
- Real-time monitoring and alerting for all financial operations

### Compliance Risks
- Regular security audits and penetration testing
- Legal review of all affiliate terms and conditions
- Documentation of all financial processes for regulatory compliance

---

## SUMMARY: Accelerated Implementation Benefits

### ✅ What We Can Leverage (Existing)
- **User wallet system** (`users.wallet_balance`) - immediate earnings visibility
- **Complete referral tracking** (`referrals` table) - extend for commissions  
- **RLS security model** - apply to new financial tables
- **Currency support** (NGN/USD) - from existing courses table
- **Audit trail patterns** (`membership_history`) - model for transactions table
- **Space/course pricing** - commission rate foundation already exists

### 🚀 Attribution-First Timeline: 9-12 weeks (vs original 12-16 weeks)
- **Phase 0**: 1-2 weeks - Referral attribution system (NEW - captures data from day 1)
- **Phase 1**: 2-3 weeks - Payment infrastructure + attribution bridge
- **Phase 2**: 1-2 weeks - Commission processing (accelerated by Phase 0 data)
- **Phase 3**: 2-3 weeks - Payout system implementation
- **Phase 4**: 2-3 weeks - Analytics and advanced features
- **Phase 5**: 2 weeks - UI enhancement with existing components
- **Phase 6**: 1-2 weeks - QA and security audit

### 💡 Key Implementation Strategy (Updated)
1. **Attribution First** - Capture referral data before payment infrastructure (Phase 0)
2. **Clean URL Structure** - Professional referral links using lokaa.app domain
3. **Extend, don't rebuild** - Add commission fields to existing referrals table
4. **Leverage existing systems** - wallet_balance, RLS patterns, currency support
5. **Zero lost data** - Complete historical attribution when payments launch
6. **Provider abstraction ready** - Schema designed for Paystack → Stripe migration

---

*This UPDATED roadmap prioritizes attribution tracking using lokaa.app domain structure to capture referral data from day 1, ensuring zero lost opportunities while building a comprehensive affiliate program with existing infrastructure leverage.*