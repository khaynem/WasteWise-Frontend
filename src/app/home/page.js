"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./landing.module.css";

export default function LandingPage() {
  const handleKnowMore = () => {
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className={styles.wrapper}>
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.logoCircle}>
            <Image src="/images/wwlogo.webp" width={30} height={30} alt="WasteWise Logo" />
          </span>
          <span>WasteWise</span>
        </div>
        <nav className={styles.links}>
          <a href="#features">System Features</a>
          <a href="#faq">FAQ</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className={styles.authBtns}>
          <Link href="/login" className={styles.loginBtn}>Login</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1>Smart Waste Management & Reporting</h1>
            <p>Optimize collection schedules, report violations, and empower cleaner communities with data-driven insights.</p>
            <div className={styles.heroActions}>
              <Link href="/login" className={styles.primaryAction}>Get Started</Link>
              <button type="button" className={styles.secondaryAction} onClick={handleKnowMore}>
                Get to Know More
              </button>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image
              src="/images/trash.webp"
              width={350}
              height={350}
              alt="Waste Illustration"
              className={styles.heroImage}
              priority
            />
          </div>
        </div>
      </section>

      <section id="features" className={styles.sectionCompact}>
        <div className={styles.blockContainer}>
          <div className={styles.blockHeader}>
            <h2>Core Features</h2>
            <p>Everything you need to manage waste operations and reporting effectively.</p>
          </div>
          <div className={styles.featuresGrid}>
            <Feature title="View Schedules" desc="Access optimized waste collection schedules in your area." iconClass="fa-solid fa-calendar-days" />
            <Feature title="Report Violation" desc="Submit waste disposal violations with photos & location." iconClass="fa-solid fa-triangle-exclamation" />
            <Feature title="Locate Recycling Centers" desc="Find nearby recycling and proper disposal locations." iconClass="fa-solid fa-recycle" />
          </div>
        </div>
      </section>

      <section id="faq" className={styles.sectionCompact}>
        <div className={styles.blockContainer}>
          <div className={styles.blockHeader}>
            <h2>Frequently Asked Questions</h2>
            <p>Common questions about WasteWise features and plans.</p>
          </div>
          <FAQList items={[
            { 
              q: "Do I need an account to use WasteWise?", 
              a: "Yes. You need to create a free account to access waste collection schedules, report violations, log waste entries, view locators, join challenges, and use the marketplace." 
            },
            { 
              q: "What's the difference between Free, Pro, and Premium plans?", 
              a: "Free is for individuals starting out with basic features. Pro adds advanced challenges, more marketplace posts, and analytics. Premium is designed for institutions with organization-wide tools, unlimited posts, and priority support." 
            },
            { 
              q: "How do I report a waste violation?", 
              a: "After logging in, go to the Reports section, fill in violation details, and optionally attach a photo and location. All users (Free, Pro, Premium) can create and edit violation reports." 
            },
            { 
              q: "What are eco-challenges and how do they work?", 
              a: "Eco-challenges are sustainability activities you can join to earn points and rewards. Free users access basic challenges, Pro users get advanced challenges, and Premium institutions can host organization-wide challenges." 
            },
            { 
              q: "Can institutions manage multiple users under one account?", 
              a: "Yes, but only with the Premium plan. Institutions can add and manage multiple users under one organization account, making it ideal for schools, companies, and LGUs." 
            }
          ]}/>
        </div>
      </section>

      <section id="pricing" className={styles.sectionCompact}>
        <div className={styles.blockContainer}>
          <div className={styles.blockHeader}>
            <h2>Choose Your Plan</h2>
            <p>Start free and upgrade as you grow</p>
          </div>
          <div className={styles.pricingGrid}>
            <PricingCard
              name="Free"
              subtitle="Residents – Standard User"
              price="0"
              period="/month"
              description="Perfect for individuals getting started with WasteWise."
              features={[
                "View waste collection schedules",
                "View recycling/junkshop locators",
                "Create, view, and edit violation reports",
                "Log daily waste entries",
                "View basic waste charts (weekly trends)",
                "Join basic eco-challenges",
                "Access educational resources",
                "Browse marketplace listings",
                "Post up to 3 marketplace items",
                "Basic eco-score display"
              ]}
              buttonText="Get Started Free"
              buttonStyle="secondary"
            />
            <PricingCard
              name="Pro"
              subtitle="Residents – Advanced User"
              price="149"
              period="/month"
              description="For committed individuals seeking advanced tools."
              features={[
                "All Free features included",
                "Access to advanced challenges with higher rewards",
                "Post up to 10 marketplace items",
                '"Pro Seller" tag on marketplace posts',
                "Early access to new sustainability articles",
                "Next pickup notifications (automated reminders)",
                "Monthly waste analytics (expanded insights)",
                "Ability to save favorite recycling locations"
              ]}
              buttonText="Choose Pro"
              buttonStyle="primary"
              popular
            />
            <PricingCard
              name="Premium"
              subtitle="Institutions – Schools, Companies, LGUs"
              price="999"
              period="/month"
              description="Organization-level tools and analytics for institutions."
              features={[
                "Waste trends across departments",
                "Report statistics & compliance summaries",
                "Unlimited marketplace posts (organization-level)",
                '"Verified Eco-Institution" badge',
                "Host organization-wide challenges",
                "Premium sustainability reports (monthly + yearly)",
                "Priority support and onboarding",
                "Data export tools (CSV/PDF)",
                "Add/manage multiple users under one institution"
              ]}
              buttonText="Choose Premium"
              buttonStyle="secondary"
            />
          </div>
          <p className={styles.pricingFootnote}>All plans include secure cloud storage and email support</p>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}

function Feature({ title, desc, iconClass }) {
  return (
    <div className={styles.featureItemCard}>
      <div className={styles.featureIconWrap}>
        <i className={iconClass} aria-hidden="true"></i>
      </div>
      <div className={styles.featureTexts}>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
}

function FAQList({ items }) {
  return (
    <div className={styles.faqAccordion}>
      {items.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.faqCard} ${open ? styles.faqOpen : ""}`}>
      <button
        type="button"
        className={styles.faqToggle}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span>{q}</span>
        <span className={styles.faqIcon}>{open ? "−" : "+"}</span>
      </button>
      <div className={styles.faqAnswer} style={{ maxHeight: open ? "260px" : "0px" }}>
        <p>{a}</p>
      </div>
    </div>
  );
}

function PricingCard({ name, subtitle, price, period, description, features, buttonText, buttonStyle, popular }) {
  return (
    <div className={`${styles.pricingCard} ${popular ? styles.pricingCardPopular : ""}`}>
      {popular && <div className={styles.popularBadge}>Most Popular</div>}
      <div className={styles.pricingHeader}>
        <h3 className={styles.pricingName}>{name}</h3>
        {subtitle && <p className={styles.pricingSubtitle}>{subtitle}</p>}
        <div className={styles.pricingPrice}>
          <span className={styles.pricingCurrency}>₱</span>
          <span className={styles.pricingAmount}>{price}</span>
          <span className={styles.pricingPeriod}>{period}</span>
        </div>
        <p className={styles.pricingDesc}>{description}</p>
      </div>
      <ul className={styles.pricingFeatures}>
        {features.map((feat, i) => (
          <li key={i} className={styles.pricingFeature}>
            <i className="fas fa-check" aria-hidden="true"></i>
            <span>{feat}</span>
          </li>
        ))}
      </ul>
      <button className={`${styles.pricingBtn} ${buttonStyle === 'primary' ? styles.pricingBtnPrimary : styles.pricingBtnSecondary}`}>
        {buttonText}
      </button>
    </div>
  );
}

function LandingFooter() {
  return (
    <footer className={styles.landingFooter}>
      <div className={styles.footerLogoCircle}>
        <img src="/images/wwlogo.webp" alt="WasteWise Logo" className={styles.footerLogoImg} />
      </div>
      <h2 className={styles.footerTitle}>WasteWise</h2>
      <p className={styles.footerSubtitle}>Smart waste management for a greener future</p>
      <p className={styles.footerCopy}>© 2025 ArcMon Techies. All rights reserved.</p>
    </footer>
  );
}