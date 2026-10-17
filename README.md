# Solve X AI

Build a modern, mobile-first AI innovation platform called Solve X.

Brand

Name: Solve X
Tagline: Turn Problems Into Solutions.

The purpose of Solve X is to help students, young innovators, entrepreneurs, researchers, and everyday people understand problems and turn them into practical ideas and possible solutions.

The app should feel like a professional AI product, not a basic chatbot.

---

1. MAIN AI ASSISTANT

Create ONE powerful AI assistant only. Do not create duplicate chatbots, duplicate floating buttons, or multiple AI windows.

The AI assistant should be able to:

- Answer questions accurately.
- Understand natural language.
- Explain difficult topics in simple language.
- Help users develop project ideas.
- Analyze problems and suggest possible solutions.
- Generate step-by-step project plans.
- Brainstorm inventions and startup ideas.
- Help with school/project research.
- Ask a clarifying question when the user's request is genuinely unclear.
- Remember the context of the current conversation.
- Give different levels of explanation depending on the user's request.
- Clearly say when information is uncertain instead of inventing facts.
- Never present made-up sources, statistics, organizations, opportunities, or facts as real.
- For current information, use a reliable web/search capability if available.
- Give structured answers using headings, bullet points, numbered steps, tables, and examples when appropriate.

The AI should prioritize accuracy over simply giving an answer quickly.

For factual questions, the AI should internally reason through the question before responding and avoid hallucinating.

---

2. TEXT INPUT

The main chat interface should have a message box similar to a modern AI assistant.

Users should be able to type:

- Questions
- Problems
- Project ideas
- School questions
- Business ideas
- Innovation challenges
- Requests for explanations

Example:

«"How can I reduce post-harvest food waste in Nigerian villages?"»

The AI should respond with useful ideas and practical next steps.

---

3. MICROPHONE / VOICE INPUT

Add a microphone button beside the text input.

When the user taps the microphone:

1. Request microphone permission if necessary.
2. Start voice transcription.
3. Show the words being transcribed while the user speaks.
4. Put the transcription into the normal message box.
5. Allow the user to edit the transcription before sending.
6. Allow the user to cancel recording.
7. Do not automatically send the message unless the user chooses to send it.

Use a free browser/device speech-recognition capability where possible, such as the Web Speech API, so the basic voice feature does not require a paid API.

If microphone permission is denied, show a simple message explaining how to enable it.

The microphone must work properly on mobile Android browsers.

---

4. IMAGE UPLOAD

Add an image/photo button beside the microphone.

Users should be able to:

- Upload an image from their device.
- Take/select a photo where the device supports it.
- Preview the image before sending.
- Remove the image before sending.
- Send an image together with a text question.

Examples:

A user uploads a picture of a machine and asks:

«"What problem do you see here?"»

Or uploads a mathematics question and asks:

«"Solve this and explain it."»

Or uploads a picture of a broken agricultural tool and asks:

«"How could I improve this design?"»

The AI should analyze the image and respond based on what is actually visible.

If the image is unclear or the AI cannot identify something reliably, it should say so rather than guessing.

---

5. AI RESPONSE DESIGN

Responses should be clean and easy to read on a phone.

Support:

- Headings
- Bullet points
- Numbered steps
- Bold important points
- Tables where useful
- Code blocks when necessary
- Short explanations
- Detailed explanations when requested

Do not make every answer unnecessarily long.

For complicated problems, use this general structure:

Understanding the problem

Possible causes / considerations

Solution or ideas

Step-by-step plan

What to do next

---

6. SOLVE X CORE FEATURE

Create a dedicated "Solve a Problem" experience.

The user enters a real-world problem.

Example:

«"Students in my community don't have reliable access to electricity for studying at night."»

Solve X should analyze the problem and produce:

Problem Understanding

Explain the problem clearly.

Possible Causes

Identify likely causes.

Solution Ideas

Generate several possible solutions.

Recommended Project Direction

Explain how one or more ideas could be developed into a real project.

Materials / Resources

List realistic resources that may be required.

Implementation Steps

Give a step-by-step plan.

Challenges

Explain possible difficulties.

Improvement Ideas

Suggest ways the solution could be improved.

Project Title

Generate a suitable project title.

---

7. CATEGORIES

Create these categories:

- Education
- Technology
- Agriculture
- Cars & Transport
- Community
- Environment
- Healthcare
- Business
- Engineering
- Other

Users should be able to choose a category when creating a problem.

---

8. APP NAVIGATION

Create a simple mobile navigation system with:

Home

Introduction to Solve X and the main AI assistant.

Problems

Browse problems submitted by users.

Ideas

Explore AI-generated project and solution ideas.

Profile

User profile, saved problems, saved ideas, and settings.

Do not overcrowd the interface.

---

9. HOME PAGE

Create a strong hero section:

Turn Problems Into Solutions.

Supporting text:

Describe a real problem. Solve X helps you understand it, explore ideas, and turn your thinking into a practical project.

Main buttons:

Solve a Problem

Ask AI

Include a simple explanation of how Solve X works:

1. Describe the problem

2. Explore possible solutions

3. Build the idea

---

10. AI CHAT EXPERIENCE

The chat should look and behave like a professional modern AI assistant.

Include:

- User messages
- AI responses
- Typing/loading indicator
- Image attachments
- Microphone input
- Send button
- New conversation button
- Conversation history if supported
- Copy response button
- Regenerate response button if supported

Keep the interface mobile-first.

---

11. IMPORTANT — DO NOT DESTROY FEATURES

When making changes:

- Do not create duplicate AI assistants.
- Do not remove image upload.
- Do not remove microphone functionality.
- Do not remove navigation.
- Do not remove saved items.
- Do not remove existing database functionality.
- Do not replace working features unnecessarily.
- Keep the design responsive.
- Keep the application fast.
- Keep the UI simple enough for a student using a phone.

If a feature already works, preserve it.

---

12. AI SAFETY AND ACCURACY

The AI should not pretend to know something it does not know.

For uncertain information:

«"I'm not certain about that. Here's what can be established..."»

For current information, use reliable current sources when web access is available.

Never invent:

- Statistics
- Research papers
- Organizations
- Grants
- Scholarships
- URLs
- Scientific facts
- Company information
- People's names or achievements

When giving factual information that could change over time, clearly indicate that the information should be verified.

---

13. DESIGN

Use a clean, modern startup/AI design.

Requirements:

- Mobile-first
- Responsive on desktop
- Simple navigation
- Professional typography
- Smooth but subtle animations
- Accessible buttons
- Clear input fields
- Good spacing
- No unnecessary visual clutter

The interface should feel like a serious technology startup.

---

14. BACKEND / AI CONNECTION

Connect the AI through a secure backend.

IMPORTANT: Never expose a private AI API key in frontend code.

Use environment variables/server-side API routes for private API credentials.

If an AI provider has not yet been configured, build the interface and backend structure so the provider can be connected later without rebuilding the entire application.

---

15. ERROR HANDLING

If the AI request fails:

Show a friendly message such as:

"Something went wrong while connecting to the AI. Please try again."

Do not show confusing technical errors to normal users.

For failed image uploads:

"We couldn't upload that image. Please try again."

For unsupported images:

"This image format isn't supported. Please choose another image."

---

16. FINAL REQUIREMENT

Before finishing, test the entire application.

Test:

- Sending text questions
- AI responses
- Microphone transcription
- Editing voice transcription
- Image upload
- Image + text questions
- Navigation
- Saving problems
- Saving ideas
- Mobile layout
- Desktop layout
- Error handling

The final product should be called Solve X and should communicate one clear purpose:

Turn Problems Into Solutions.

Build the application as a real usable product, not just a visual mockup.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://idea-engine-hub-84.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d13d7d8-35bc-46e7-8f70-0e08ded3e450).

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
