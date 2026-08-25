# Component Insight

Smart Multi-Tester with Artificial Intelligence for Electronic Component Diagnosis (IC)

Project Overview

Build a modern, production-ready web application called Smart Multi-Tester with Artificial Intelligence for Electronic Component Diagnosis (IC).

The system assists technicians, students, engineers, and electronics repair specialists in diagnosing Integrated Circuits (ICs) and electronic components using Artificial Intelligence.

The interface must look like a professionally designed industrial electronics software—not an AI-generated template. Use a clean dashboard similar to laboratory equipment software with blue, white, and dark gray accents, rounded cards, modern typography, responsive layouts, and intuitive navigation.

Do NOT generate placeholder, dummy, or fake diagnostic records. The application should only display real user-uploaded data stored in Supabase.

Technology Stack
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
Supabase
OpenAI Vision API (or GPT-4.1 Vision) for image analysis
TensorFlow.js (optional for future local inference)
Recharts for analytics
React Router
React Query
Supabase Authentication
Supabase Storage
Supabase Database
WebRTC MediaDevices API for live camera
Authentication

Use Supabase Authentication.

Implement:

Login
Logout
Forgot Password
Email Verification
Session Persistence
Protected Routes
Role-Based Access Control (RBAC)
Default Admin Account

Automatically create this administrator account during database initialization.

Role:
Admin

Username (Email):

shernanjerk@gmail.com

Password:

Lindie@29

If the account already exists, do not create a duplicate.

User Roles
Admin

Can:

Manage users
Approve newly registered users before login access is granted
Delete users
Disable users
Reset passwords
View all diagnosis history
View uploaded images
View live camera captures
View AI reports
Export reports
Dashboard analytics
Manage system settings
User

Can:

Register account
Wait for admin approval
Login after approval
Use live camera
Upload IC images
Receive AI diagnosis
View recommendations
Download PDF reports
View diagnosis history
Dashboard

Create a professional dashboard with:

Total Diagnoses
Today's Diagnoses
Healthy Components
Defective Components
Pending Analysis
Recent Diagnoses
AI Confidence Rate
Weekly Statistics

Use Recharts.

Navigation

Sidebar:

Dashboard

AI Diagnosis

Live Camera

Upload Image

Diagnosis History

Reports

Profile

Settings

Admin Panel (Admin only)

AI Diagnosis Module

Users can analyze electronic components by:

Option 1

Upload Image

Supported formats:

JPG
PNG
JPEG
WEBP

Maximum size:

20MB

Option 2

Live Camera

Use browser camera.

Features:

Live Preview
Capture
Retake
Zoom
Flash (if supported)
Switch Camera (mobile)

Captured image automatically uploads to Supabase Storage.

AI Analysis

After image submission:

Send image to OpenAI Vision API.

The AI should analyze:

Burn marks
Broken pins
Corrosion
Oxidation
Missing pins
Bent pins
Physical cracks
Heat damage
Package deformation
PCB contamination
Improper solder residue
Label readability
Surface discoloration

Determine:

Component appears normal
Possible defect detected
Severe defect detected
Cannot determine from image
AI Result

Display:

Component Name

Package Type

Manufacturer (if recognizable)

Visible Damage

Damage Severity

Possible Cause

Confidence Score

Diagnosis Summary

Recommended Action

Estimated Repairability

Recommendations

Generate recommendations based on detection.

Example:

Burn Mark

Recommendation:

Replace IC immediately.
Check nearby voltage regulators.
Verify power supply.
Inspect PCB traces.

Bent Pins

Recommendation:

Straighten pins carefully.
Inspect for broken connections.
Test continuity.

Corrosion

Recommendation:

Clean using IPA.
Dry thoroughly.
Inspect solder joints.

Crack

Recommendation:

Replace component.
Avoid reuse.

Healthy Component

Recommendation:

No visible issue detected.
Continue electrical testing using a multimeter.
Verify functionality under operating conditions.
Confidence Indicator

Show:

AI Confidence

Example:

98%

Color:

Green

If confidence below 70%:

Display warning:

Manual inspection recommended.

Reports

Generate downloadable PDF.

Include:

Company Header

Image

Diagnosis

Recommendations

Date

Technician

AI Confidence

QR Code

Diagnosis History

Store every diagnosis in Supabase.

Include:

Image

User

Date

Time

Diagnosis

Confidence

Recommendation

Status

Search

Pagination

Filter

Export CSV

Export PDF

Supabase Storage

Create buckets:

component-images

camera-captures

reports

Database Tables

profiles

id

email

name

role

approved

created_at

diagnosis

id

user_id

image_url

analysis

confidence

recommendation

status

created_at

reports

id

diagnosis_id

pdf_url

created_at

system_logs

id

user

action

timestamp

Admin Panel

Admin can:

Approve Users

Reject Users

Delete Users

Change Roles

View Logs

Dashboard Statistics

Manage Storage

View Reports

Profile Page

Users can edit:

Profile Picture

Name

Password

Email

Notifications

Toast notifications:

Image Uploaded

Camera Connected

Analysis Started

Analysis Completed

PDF Generated

Account Approved

Security

Implement:

Supabase Row Level Security (RLS)

Role-based authorization

Secure API Keys

Server-side AI requests (never expose API keys in the client)

Input validation

Rate limiting

Secure file uploads with MIME type and size validation

UI/UX Requirements

Create a unique interface inspired by professional laboratory diagnostic equipment.

Requirements:

Modern industrial design
Glassmorphism only where appropriate
Rounded cards
Responsive layout
Smooth animations
Dark/Light mode
Custom icons
Professional charts
Clean typography
No AI-generated style or generic dashboard appearance

The design should resemble high-end electronics testing software used in repair laboratories.

Data Integrity

Do not use any fake, random, placeholder, or generated diagnostic data.

Only display:

Real uploaded images
Real AI analysis
Real Supabase records
Real authenticated users

The dashboard should remain empty until actual records are created.

Future Scalability

Design the architecture to support future integration with:

ESP32 Smart Multi-Tester
Digital Multimeter via USB/Bluetooth
Oscilloscope data
Thermal camera imaging
Automatic IC identification using OCR
Component database lookup
Predictive maintenance using machine learning
Mobile application integration
Expected Outcome

Generate a fully functional, production-ready web application with complete frontend, backend integration, Supabase authentication and database, secure role-based access control, live camera support, image upload, AI-powered electronic component diagnosis, downloadable PDF reports, comprehensive history tracking, and an industrial-grade user experience. The system must use only real data from Supabase and AI analysis—never fabricated or placeholder content.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fdbc497e-030d-40c1-9c25-1b159cd73317).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
