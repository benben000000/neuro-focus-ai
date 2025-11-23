# RTC Research Brief for NeuroFocus

This document summarizes insights from Discord, Slack, Telegram, WhatsApp
groups, BeReal, and other modern RTC/chat products, specifically tailored to
NeuroFocus.

## 1. Baseline User Expectations

Users coming from platforms like Discord and Slack have established expectations
for real-time communication:

### Voice Channels

- **Drop-in/Drop-out:** Frictionless entry and exit without "calling" users.
- **Visual Indicators:** Who is speaking (green ring/halo), who is muted, who is
  deafened.
- **Screen Sharing:** Low-latency screen sharing within voice channels.
- **Noise Suppression:** Built-in background noise handling.

### Text Channels

- **Rich Text:** Markdown support (bold, italic, code blocks).
- **Media Embeds:** Images, videos, and link previews display inline.
- **Reactions:** Emoji reactions to messages.
- **Edit/Delete:** Ability to correct or remove own messages.

### Threading

- **Context:** Ability to reply to specific messages to keep conversation
  organized (Slack style sidebar or Discord style inline).
- **Collapsing:** Threads shouldn't clutter the main feed.

### Notifications

- **Granularity:** Per-channel mute settings, @mentions only, or all messages.
- **Global Settings:** Do Not Disturb, Online, Idle statuses.

### Roles & Moderation

- **Hierarchy:** Admins, Moderators, Members with distinct permissions.
- **Visual Distinction:** Color-coded usernames based on roles.
- **Tools:** Ban, kick, mute, and slow-mode for channels.

## 2. Gaps & Opportunities for NeuroFocus

NeuroFocus can differentiate by integrating productivity and study-specific
features into the RTC layer:

- **Study-Room Timers:** Voice channels with integrated Pomodoro timers visible
  to all participants.
- **Collaborative Focus Sessions:** "Silent Library" channels where microphone
  is auto-muted, and video is optional but encouraged for accountability.
- **Peer Tutoring Requests:** A specific "Raise Hand" or "Help Needed" status
  that signals expertise is required in a specific subject.
- **Ambient Accountability Cues:**
  - "Studying [Subject]" status updates automatically linked to app activity.
  - Visual streaks displayed next to usernames in the member list.
- **Focus Mode Enforcement:** Option to block distracting notifications while in
  a "Deep Work" voice channel.

## 3. UX Best Practices: Channel Hierarchies (Desktop vs. Mobile)

### Desktop

- **Sidebar Navigation:** Vertical list of servers/groups on far left, channels
  in second column.
- **Always Visible:** Channel list remains visible while chatting.
- **Categories:** Collapsible channel categories (e.g., "General", "Study
  Groups", "Voice").

### Mobile

- **Drawer Navigation:** Hamburger menu or swipe-from-left to access channel
  list.
- **Bottom Tabs:** Quick switch between DM, Servers, and Activity.
- **Unified Header:** Tapping channel name at top triggers channel
  switch/details.
- **Gestures:** Swipe right to reply, long press for actions.

## 4. Notification/Presence & Call History

### Notification Preferences

- **Smart Push:** Only notify on mobile if desktop is idle (Discord behavior).
- **Digest Mode:** Summary of missed study session invites or high-priority
  mentions.
- **Focus-Aware:** Suppress non-urgent notifications when the user is in a
  timer-active session.

### Presence

- **Rich Presence:** "Studying Biology - 25m remaining" instead of just
  "Online".
- **Custom Status:** User-defined emojis and text.

### Call History

- **Session Logs:** Instead of just "Call ended", show "Study Session: 2 hours
  focused".
- **Artifacts:** Links shared during the session should be aggregated in a
  "Session Resources" tab.

## 5. Competitor Comparison

| Feature            | Discord                         | Slack                   | WhatsApp                 | NeuroFocus (Target)                  |
| :----------------- | :------------------------------ | :---------------------- | :----------------------- | :----------------------------------- |
| **Core Vibe**      | Gamer/Community Hangout         | Work/Async Productivity | Personal/Group Messaging | **Co-working/Academic Focus**        |
| **Voice Model**    | Room-based (Channels)           | Huddle/Call             | Call-based               | **Room-based + Timer Sync**          |
| **Structure**      | Servers > Categories > Channels | Workspaces > Channels   | Flat Group Lists         | **Study Groups > Topic Channels**    |
| **Accountability** | Screen Share                    | Status Updates          | Read Receipts            | **Live Streaks, Auto-Status, Goals** |
| **Threading**      | Inline & Split View             | Sidebar Heavy           | Reply Chains             | **Lightweight Context (Reply-to)**   |
| **Video**          | Grid View                       | Strip/Grid              | Grid (Mobile dominant)   | **"Study with me" Mode (PiP)**       |

## 6. Recommendations & Engineering Tasks

To achieve the NeuroFocus vision, we recommend the following roadmap mapping to
engineering tasks:

### Phase 1: Foundation (Schema & UI)

- **Schema Design:**
  - Create `channels` collection (type: `text` | `voice`).
  - Add `presence` field to User model (status, currentActivity).
  - _Task:_ Define Firestore rules for channel access based on study group
    membership.
- **UI Implementation:**
  - Build `ChannelList` component with collapsible categories.
  - Implement `ChatInterface` with basic markdown rendering.
  - _Task:_ Adapt `MediaCarousel` for displaying shared study materials in chat.

### Phase 2: RTC Integration (Provider Choice)

- **Provider Selection:**
  - **Recommendation:** **Agora** or **LiveKit**. Both offer robust React SDKs
    and support voice/video/screen sharing. LiveKit is open-source friendly;
    Agora has massive scale.
  - _Decision:_ Use **LiveKit** for better developer experience and flexibility
    with "room" metadata (crucial for syncing timers).
- **Voice Implementation:**
  - _Task:_ Integrate LiveKit client.
  - _Task:_ Create `ActiveCallBar` component showing current speakers and timer
    status.

### Phase 3: NeuroFocus Specifics

- **Feature:** Synchronized Pomodoro Timer in Voice Channels.
  - _Task:_ Implement server-side timer state or leader-based client sync.
- **Feature:** Rich Presence Hooks.
  - _Task:_ Update `useSecurity` or activity hooks to broadcast current study
    subject to user profile/status.
