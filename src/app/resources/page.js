"use client";

import styles from "./resources.module.css";

export default function ResourcesPage() {
  const resources = [
    // Articles
    {
      id: 1,
      type: "article",
      icon: "📚",
      title: "Goal 12: Ensure sustainable consumption and production patterns",
      image: "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762934747/sdg-12_q2zlpq.webp",
      description:
        "Goal 12 is about ensuring sustainable consumption and production patterns, which is key to sustain the livelihoods of current and future generations.",
      link: "https://www.un.org/sustainabledevelopment/sustainable-consumption-production"
    },
    {
      id: 2,
      type: "article",
      icon: "📚",
      title: "The 3Rs explained (Reduce, Reuse, Recycle)",
      image: "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762935331/3Rs-pic_tllver.webp",
      description:
        "Explains what the 3Rs are and the importance of using them when it comes to managing waste.",
      link: "https://travelifestaybetter.com/the-3rs-explained-reduce-reuse-recycle"
    },
    {
      id: 3,
      type: "article",
      icon: "📚",
      title: "Why Waste Segregation Is More Important Than You Think",
      image:
        "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762935483/young-woman-indoors-at-home-separating-glass-pape-2021-08-27-23-30-09-utc-min-1024x674_sck844.jpg",
      description:
        "Scientists warn about growing waste problems, emphasizing the importance of properly segregating different types of waste for better waste management.",
      link: "#"
    },
    {
      id: 4,
      type: "article",
      icon: "📚",
      title: "What Is E-Waste Recycling and How Is it Done?",
      image: "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762935543/Untitled-design-30.jpg_fwa4bz.webp",
      description:
        "E-waste recycling involves breaking down old electronics to recover valuable materials for reuse, but challenges still limit its growth and improvement.",
      link: "https://earth.org/what-is-e-waste-recycling"
    },

    // Infographics
    {
      id: 10,
      type: "infographic",
      icon: "💡",
      title: "Waste and Garbage Management Infographic",
      image: "https://i.pinimg.com/1200x/3d/0a/b3/3d0ab39f5d76674bf5ef700ade933043.jpg",
      description:
        "An infographic explaining a few ways to segregate and properly manage your household/school/work waste and garbage.",
      link: "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762935755/3d0ab39f5d76674bf5ef700ade933043_fuhlx0.jpg"
    },
    {
      id: 11,
      type: "infographic",
      icon: "💡",
      title: "Composting Do's & Don'ts",
      image: "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762936106/Composting_Infographic_2434_n5vpgi.webp",
      description:
        "There are a number of Do's & Don'ts when it comes to composting - a simple checklist and common problems to watch for.",
      link: "https://www.harrodhorticultural.com/uploads/images/content/Composting%20Infographic_2434.jpg"
    },
    {
      id: 12,
      type: "infographic",
      icon: "💡",
      title: "5 Rs of Waste Reduction",
      image: "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762936308/9768c019c70488b91001c346105e7180_pvo5hf.jpg",
      description: "Learn about the 5 Rs of Waste Reduction!",
      link: "https://i.pinimg.com/736x/97/68/c0/9768c019c70488b91001c346105e7180.jpg"
    },
    {
      id: 13,
      type: "infographic",
      icon: "💡",
      title: "Plastic pollution",
      image: "https://res.cloudinary.com/dfuepnrwb/image/upload/v1762936440/a0b4167ca91d71e7e229179f5e0b5672_idy8nw.jpg",
      description: "Plastic pollution is harming the world — visual summary and facts.",
      link: "https://i.pinimg.com/736x/a0/b4/16/a0b4167ca91d71e7e229179f5e0b5672.jpg"
    }
  ];

  const getTypeLabel = (type) => {
    switch (type) {
      case "article":
        return "Article";
      case "video":
        return "Video";
      case "infographic":
        return "Infographic";
      case "external":
        return "External Link";
      default:
        return "Resource";
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.pageLabel}>Resources</h1>
        <p className={styles.pageDesc}>
          Explore articles, videos, and infographics about sustainable living and waste reduction
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.gridWrap}>
          <div className={styles.resourcesGrid}>
            {resources.map((resource) => (
              <div key={resource.id} className={styles.resourceCard}>
                <div className={styles.imageWrapper}>
                  <img src={resource.image} alt={resource.title} className={styles.resourceImage} />
                  <div className={styles.typeBadge}>
                    <span className={styles.typeIcon}>{resource.icon}</span>
                    <span className={styles.typeLabel}>{getTypeLabel(resource.type)}</span>
                  </div>
                  {/* category removed */}
                </div>

                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{resource.title}</h3>
                  <div className={styles.cardPartition} aria-hidden="true" />
                  <p className={styles.cardDesc}>{resource.description}</p>

                  <div className={styles.cardBottom}>
                    <a href={resource.link} className={styles.viewBtn} target="_blank" rel="noopener noreferrer">
                      {resource.type === "external" ? "Visit Resource" : "Read More"}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}