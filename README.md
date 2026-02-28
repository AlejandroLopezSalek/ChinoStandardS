# TurkAmerica - Turkish Learning Platform

[![Code Quality](https://img.shields.io/badge/SonarQube-Passed-success?style=flat-square&logo=sonarqube&logoColor=white)](https://www.sonarqube.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4%2B-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)

> **TurkAmerica** is a high-performance educational platform engineered to bridge the linguistic gap for Spanish speakers learning Turkish. This project utilizes a sophisticated hybrid architecture, merging the lightning-fast performance of Static Site Generation (SSG) with the robustness of a scalable RESTful API. It integrates context-aware Artificial Intelligence to deliver a personalized, adaptive learning experience that evolves with the user.

---

## System Architecture

The ecosystem relies on a containerized microservices architecture, ensuring that every component is isolated, scalable, and secure by design.

```mermaid
graph LR
    User((User))
    DNS[DNS / Cloudflare]
    Nginx[Nginx Reverse Proxy]
    App[Node.js Application]
    DB[(MongoDB Atlas/Local)]
    AI[AI Inference Engine]

    subgraph "Secure Infrastructure"
    Nginx
    App
    DB
    end

    User -->|HTTPS Encrypted| DNS
    DNS -->|Resolution| Nginx
    Nginx -->|Proxy Pass / SSL Termination| App
    App -->|Mongoose ODM| DB
    App -->|Context API| AI
    AI -->|Text Generation| App
    App -->|JSON / HTML| User

    style Nginx fill:#009688,stroke:#fff,stroke-width:0px,color:#fff
    style App fill:#2c3e50,stroke:#fff,stroke-width:0px,color:#fff
    style DB fill:#27ae60,stroke:#fff,stroke-width:0px,color:#fff
    style AI fill:#8e44ad,stroke:#fff,stroke-width:0px,color:#fff
```

### Core Components

1.  **Static Frontend (Eleventy Integration)**: The visual core is pre-rendered using **11ty** (Eleventy). This approach eliminates server-side rendering latency, drastically improving SEO, Time to First Byte (TTFB), and First Contentful Paint (FCP) metrics.
2.  **Enterprise-Grade REST API (Express.js)**: Manages dynamic business logic with a focus on security and maintainability:
    *   **Authentication & Authorization**: A robust system utilizing JWT (JSON Web Tokens) and OAuth2 (Google) policies.
    *   **State Management**: Complex tracking of user progress, adaptive curriculum unlocking, and study streaks.
    *   **Security Layer**: Implementation of `Helmet` for strict HTTP headers, Content Security Policy (CSP), and `express-rate-limit` to mitigate DDoS and brute-force vectors.
3.  **Design System (TailwindCSS)**: Deploys a utility-first design framework with a custom configuration (`tailwind.config.js`) to ensure strict visual consistency, responsive behavior across devices, and native dark mode support.

---

## Data Pipelines

### Authentication & Session Lifecycle

The following sequence diagram illustrates the secure authentication flow implemented within `/server/routes/auth.js`, adhering to industry best practices for credential handling.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (Client)
    participant API as API (Express)
    participant DB as MongoDB

    U->>FE: Input Credentials
    FE->>API: POST /api/auth/login
    Note right of FE: Input Validation (Regex/Length)
    API->>API: Sanitize & Validate (Express-Validator)
    API->>DB: Find User & Compare Password (Bcrypt)
    DB-->>API: User Data
    API->>API: Generate Signed JWT (7 Days)
    API-->>FE: Token + User Profile
    FE->>FE: Secure Storage (LocalStorage)
    
    Note over U, FE: Session Established

    U->>FE: Access Lesson Content
    FE->>API: GET /api/lessons (Auth Header)
    API->>API: Verify JWT Middleware
    API-->>FE: Protected Resource
```

---

## DevOps Strategy & Continuous Deployment

We implement a streamlined yet robust CI/CD pipeline powered by automated shell scripting (`deploy.sh`) and process orchestration via PM2, ensuring zero-downtime deployments.

```mermaid
graph TD
    Dev[Developer]
    Git[Git Repository]
    Server[Production Server]
    Build[Build Pipeline]
    PM2[PM2 Process Manager]

    Dev -->|Push Commit| Git
    Git -->|Webhook / Manual Trigger| Server
    
    subgraph Production Environment
    Server -->|Git Pull and Reset| Git
    Server -->|NPM CI Prod Dependencies| Build
    Build -->|Eleventy Build| StaticFiles[Static Assets]
    Build -->|Tailwind Minify| CSS[Optimized CSS]
    StaticFiles --> PM2
    CSS --> PM2
    PM2 -->|Graceful Reload| Online[Active Service]
    end

    style PM2 fill:#e74c3c,stroke:#fff,color:#fff
    style Build fill:#3498db,stroke:#fff,color:#fff
```

### Quality Assurance & Security Compliance

This codebase has been audited to meet professional development standards:

*   **SonarQube Compliance**: The code has passed static analysis for security hotspots, code smells, and technical debt.
*   **Dependency Integrity**: Strict usage of `npm ci` in production environments ensures that the deployed dependency tree matches the tested environment exactly (determinism).
*   **Input Sanitization**: All incoming data streams undergo rigorous sanitization via `mongo-sanitize` (to prevent NoSQL Injection) and `xss-clean` (to neutralize Cross-Site Scripting attacks).
*   **Error Handling**: A centralized global error handler masks stack traces in production, preventing sensitive information leakage.

---

## Detailed Tech Stack

| Domain | Technologies & Libraries | Purpose |
| :--- | :--- | :--- |
| **Backend** | `Node.js`, `Express` | High-performance server runtime and framework |
| **Database** | `MongoDB`, `Mongoose` | Scalable NoSQL persistence and strict schema modeling |
| **Security** | `Helmet`, `BcryptJS`, `JWT`, `Cors` | Endpoint hardening, hashing, and access control |
| **Frontend** | `Eleventy`, `Nunjucks` | Ultra-fast Static Site Generation (SSG) |
| **Styling** | `TailwindCSS`, `PostCSS` | Utility-first CSS framework with post-processing |
| **Infrastructure** | `PM2`, `Docker` | Process orchestration and containerization |
| **Validation** | `Express-Validator` | Type-safe input validation and sanitization |

---

## License

This project is distributed under the **MIT License**. Please refer to the `LICENSE` file for further details.

---

**Developed by Alejandro @ ODL**