# ⚡ PulsePay

<p align="center">
  <strong>Evidence-Driven AI Revenue Recovery & Payment Intelligence</strong>
</p>

<p align="center">
  <em>
    Recover more revenue without blindly retrying payments.
  </em>
</p>

<p align="center">

![AI Revenue Recovery](https://img.shields.io/badge/AI-Revenue%20Recovery-2563EB?style=for-the-badge)
![Evidence Driven](https://img.shields.io/badge/Decisioning-Evidence%20Driven-7C3AED?style=for-the-badge)
![Calibrated ML](https://img.shields.io/badge/ML-Calibrated-0891B2?style=for-the-badge)
![Deterministic Safety](https://img.shields.io/badge/Safety-Deterministic-059669?style=for-the-badge)
![Synthetic Data](https://img.shields.io/badge/Data-Synthetic-F59E0B?style=for-the-badge)

</p>

<p align="center">

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Scikit Learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat-square&logo=scikit--learn&logoColor=white)

</p>

---

# 🧭 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [Why Blind Retry Is Not Enough](#-why-blind-retry-is-not-enough)
- [The PulsePay Solution](#-the-pulsepay-solution)
- [Core Design Principle](#-core-design-principle)
- [Decision Pipeline](#-decision-pipeline)
- [Revenue Risk Detection](#1--revenue-risk-detection)
- [Recovery Scoring](#2--recovery-scoring)
- [Probability Calibration](#3--probability-calibration)
- [Expected Value Optimization](#4--expected-value-optimization)
- [Strategy Selection](#5--strategy-selection)
- [Deterministic Safety](#6--deterministic-safety)
- [Bounded Execution](#7--bounded-execution)
- [Outcome Measurement](#8--outcome-measurement)
- [AI vs Deterministic Control](#-ai-vs-deterministic-control)
- [Evidence-Driven Explanations](#-evidence-driven-explanations)
- [Counterfactual Strategy Analysis](#-counterfactual-strategy-analysis)
- [Recovery Mission](#-recovery-mission)
- [Product Interface](#-product-interface)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Backend Services](#-backend-services)
- [Data Model](#-data-model)
- [Authentication](#-authentication)
- [Benchmark](#-authoritative-benchmark)
- [Benchmark Methodology](#-benchmark-methodology)
- [Benchmark Results](#-benchmark-results)
- [Calibration Results](#-calibration-results)
- [Safety Results](#-safety-results)
- [Live Operations vs Benchmark](#-live-operations-vs-benchmark)
- [Demo Dataset](#-demo-dataset)
- [Demo Walkthrough](#-demo-walkthrough)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Engineering Principles](#-engineering-principles)
- [Limitations](#-limitations)
- [Production Roadmap](#-production-roadmap)
- [Buildathon Positioning](#-buildathon-positioning)
- [Final Takeaway](#-final-takeaway)

---

# 📌 Overview

**PulsePay** is an evidence-driven AI revenue recovery and payment intelligence
platform designed around a simple question:

> **When a payment fails, what should the system do next — and is that action
> actually worth taking?**

Most payment recovery systems begin with the assumption that a failed payment
is an opportunity to retry.

PulsePay starts one step earlier.

It first determines whether the payment represents **recoverable revenue**,
estimates the probability of successful recovery, calibrates that probability,
evaluates the economics of possible interventions, compares alternative
strategies, applies deterministic safety policies, and only then allows a
bounded execution workflow.

The resulting architecture is:

```text
                    PAYMENT FAILURE
                          │
                          ▼
                 Revenue at Risk
                          │
                          ▼
                 Recovery Scoring
                          │
                          ▼
                Probability Calibration
                          │
                          ▼
                  Expected Value
                          │
                          ▼
                Strategy Comparison
                          │
                          ▼
                Safety Policy Engine
                          │
                   ┌──────┴──────┐
                   │             │
                 BLOCK         ALLOW
                   │             │
                   ▼             ▼
                  STOP       Execute
                                 │
                                 ▼
                              Outcome
                                 │
                                 ▼
                              Audit