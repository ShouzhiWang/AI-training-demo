# AI-Native Learning Platform MVP Specification

## Overview

Build a demo-ready MVP of an AI-native learning platform for middle/high
school students.

Goal: Demonstrate a platform where students can use AI agents to create
projects without worrying about setup, Git, accounts, or infrastructure.

Core flow:

Student idea -\> AI guidance -\> Project workspace -\> AI-assisted
changes -\> Preview -\> Portfolio output

This is a demo MVP, not a production system.

Do not implement: - Daytona - Kubernetes - real cloud containers - real
GitHub deployment - complex authentication - billing

Use mocked implementations where necessary.

## Product Vision

The platform is an AI-native creation environment for learners.

Traditional: Open IDE -\> Understand files -\> Write code

AI-native: Have an idea -\> Explain idea -\> AI helps plan -\> AI
creates/modifies project -\> Student tests and improves

The AI should behave like a mentor, not only a code generator.

## Target Users

Middle/high school students: - limited programming experience - no
Git/GitHub experience - no AI API accounts

Primary demo: Students creating kindergarten educational games.

## Core Demo Flow

### Dashboard

Show projects and allow students to create projects.

### Create Project

Provide templates: - Game Prototype - Market Research Report

For MVP implement Game Prototype.

### AI Project Setup

Student enters an idea.

Example: "I want a game where children match animals with habitats."

AI generates: - game name - target user - learning goal - player
action - feedback - difficulty

### AI Workspace

Main interface: - AI Assistant - Project Files - Preview

AI is the primary interaction.

### Mock AI Agent

Create AgentService abstraction:

-   generateGamePlan()
-   suggestFeature()
-   applyChange()
-   reviewProject()

Use mocked responses but keep architecture ready for real APIs.

### Preview

Create a simple playable game preview that updates after AI changes.

## Learning Layer

AI should guide students:

Before coding: - What problem does this feature solve? - Will the user
understand it? - Is this necessary?

Then: Plan -\> Implement -\> Test

## Portfolio Output

Generate a showcase page:

-   project name
-   team members
-   learning goal
-   features
-   development process

## Technical Stack

Frontend: - Next.js - TypeScript - Tailwind CSS

Backend: - Next.js API routes

Storage: - Local JSON for MVP

Future: - PostgreSQL

## Design Principles

The UI should feel like: - modern startup product - Notion simplicity -
Linear cleanliness - AI-native interface

Avoid: - complicated IDE appearance - overwhelming technical details

Primary action:

"Tell AI what you want to create."

## Future Architecture

MVP:

Student Browser -\> Platform -\> Mock Agent -\> Local Project Data

Future:

Student Browser -\> Platform Backend -\> Agent Orchestrator -\> Cloud
Workspace -\> GitHub Repository

## Success Criteria

The demo succeeds if users understand:

"Students can create projects with AI without installing anything."

The platform should communicate: - AI is a collaborator - students focus
on ideas - technical barriers disappear - projects become portfolio
artifacts
