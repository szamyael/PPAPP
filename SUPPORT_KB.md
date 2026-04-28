# PPAPP Support Knowledge Base

## Quick FAQs & Pre-made Responses

### Account & Login
- **How do I reset my password?** → Contact support through ticket system
- **Why can't I login?** → Check internet connection, clear browser cache, try incognito mode
- **Do I need to approve my account?** → Yes, organizations/admins must approve new accounts
- **What's my organization code?** → Check your dashboard under "Organization Code"

### Tutoring Sessions
- **How do I book a session?** → Go to "Find Tutors", select a tutor, choose date/time
- **How do I join a video call?** → Click "Join Video Call" button on the session card
- **Can I cancel a session?** → Yes, cancel pending sessions from "My Sessions"
- **How are tutors rated?** → Rate after session completion in "My Sessions"

### Dashboard & Features
- **Where's my dashboard?** → Check your role: Students, Tutors, Organizations each have different dashboards
- **How do I upload materials?** → Tutors use "Learning Materials" section on dashboard
- **What's the newsfeed?** → Community board to share questions, announcements, events, materials

### Organization Features (Org Admins)
- **How do I share organization code?** → Share unique code from org dashboard to recruit tutors
- **How do I approve tutor applications?** → Go to "Pending Tutor Applications" on org dashboard
- **Can I approve learning materials?** → Yes, review and approve in "Learning Materials Library"

### Technical Issues
- **The app is loading slowly** → Try refreshing, check internet speed, disable extensions
- **Can't see real-time updates** → Refresh page, check database connection status
- **Getting an error message?** → Note the error and file a ticket with screenshot

## Common Solutions (No API Call Needed)

| Issue | Solution |
|-------|----------|
| "Loader spinning forever" | Refresh page, clear cache, check internet |
| "Can't find tutor" | Try different search filters, check tutor availability |
| "Session didn't start" | Check date/time, refresh, contact tutor |
| "Can't upload file" | Check file size (max 25MB), format, internet connection |
| "Notification not received" | Check spam folder, enable notifications in settings |

## Tutorial Steps

### For Students
1. Sign up with email
2. Wait for admin approval
3. Go to Dashboard
4. Click "Find a Tutor"
5. Select tutor & book session
6. Join video call when ready

### For Tutors
1. Sign up with organization code
2. Wait for organization & admin approval
3. Upload credentials and materials
4. Set availability
5. Accept student bookings
6. Conduct sessions, collect reviews

### For Organizations
1. Create org account
2. Share organization code
3. Review pending tutor applications
4. Approve/reject tutors
5. Monitor materials library
6. Manage organization members

## API Usage Guidelines

- **Per-User Limits**: Max 5 API calls per session to conserve tokens
- **Caching**: Frequently asked questions use pre-made responses (no API call)
- **Escalation**: Unique issues should be filed as tickets, not asked to chat
- **Rate Limiting**: If user asks >5 questions, suggest filing ticket

## Ticket Filing Guidelines

Direct users to file a ticket if:
- Bug/error with screenshots needed
- Feature request or enhancement
- Account-specific issue (approval, permissions)
- Payment or billing concern
- Data recovery or account recovery
- Session issue between student & tutor
