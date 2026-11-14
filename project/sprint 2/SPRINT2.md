# SPRINT1: ClassNotes, Student Note Capture & Organizer

## 1. Project Recap
This project is a note-taking tool designed for students who struggle to take organized notes while keeping up with lectures or studying. Its core workflow allows students to quickly capture and save their thoughts, then organize those notes into structured information that is easier to review later. The goal is to help students focus on capturing information first without worrying about organizing everything immediately.

## 2. Workflow Demo Guide
1) Start the application locally using the appropriate instructions for the project.
2) Open the local webpage in your browser.
3) Enter a sessoin title as well as a sample set of unorganized class notes into the note-taking interface.
4) Use the "Save session" function to store the notes.
5) Use the organization feature to turn the raw notes into a more structured format.
6) Review the organized notes and verify that the information is easier to understand and navigate.
7) Use the "New session" to start a new set of notes.

## 3. AI Usage Log & Reflection
I used AI tools to help me understand and work through coding questions while developing ClassNotes. I used AI assistance to help structure the HTML interface and implement JavaScript functionality, including saving sessions, tracking word and character counts, updating the progress indicator, and organizing notes into categories. However, the AI initially provided guidance that did not fully resolve the functionality of the Save Session and New Session features because the JavaScript functions in app.js were not working as intended. I had to troubleshoot and fix the JavaScript functionality to get these features working properly. This experience taught me that AI-generated code is not always correct or functional on the first attempt and that it is important to test the application, identify problems, and verify that the code behaves as expected. I reviewed the generated code and integrated it into the project, checking that the interface elements and event handlers worked together. One important implementation detail is that the current note organization feature uses rule-based JavaScript to categorize lines based on keywords and question marks rather than calling an actual AI service. Reviewing this distinction helped me better understand the difference between implementing an interactive workflow and integrating a real AI model. Overall, AI served as a coding and learning aid, while I remained responsible for reviewing the implementation and understanding how the application works.