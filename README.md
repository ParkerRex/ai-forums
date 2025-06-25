**RESULT**: A replacement for the old skool website that makes people enjoy engaging with our community.
its fun to work on, easy to understand, and a great way for devs to contribute if they so please.

**PURPOSE**:

- To understand how convex works and how to make the site easy to work on
- To provide a better member experience for our members, and to be a household name
- To bring AI to the member experience in the form of chatbots that can answer questions from both the discord and the website.

**MAP** (massive action plan):

- [x] **Scaffold out the data models needed (members, posts, content, events)**
- [x] Breadboard the different pages and components needed for the site

**ACTIONS:**

> in order to get the dopamine flowing, im going to put the components in place and stub them out.....

- [x] Add ShadCN/ui
- [x] Make simple layout
- [x] Connect the `header.tsx`
- [ ] Connect the `post-sidebar.tsx`
- [ ] Connect the `post-detail.tsx`
- [ ] Connect the `post-card.tsx`
- [ ] Connect the `post-list.tsx`
- [ ] Connect the `comment-section.tsx`
- [ ] Connect the `member-card.tsx`
- [ ] Connect the `sign-in-form.tsx`
- [ ] Write the queries for the members
- [ ] Write the queries for posts
- [ ] Write the queries for categories
- [ ] Write the mutations for members
- [ ] Write the mutations for posts
- [ ] Write the mutations for categories
- [ ] Export the member data as a csv
- [ ] Set up the brand guidelines and add as a cursor rule
- [x] **make a reddit style voting system for posts for members only (will test this then give it to differetn tiers later)**
- [ ] Set up payments via stripe
- [ ] Set up a discord bot that can keep track of memberships
- [ ] Set up a discord bot that can provide users with automated summaries of channels on a set scheduel (this is probably just a cron using convex)
- [ ] Make a 3d /AI object that rotates on screen

---

## To Learn:

- [ ] how does caching work?
- [x] how does data fetching work?

### Functions

**Internal functions**
These remind me a lot fo the private procedures in tRPC.

- [ ] do i need to use a library for the voting system?
      .... ideally i dont have to add a single library lol ...
      where do tables live?

**Validation**

be a lot easier if i just do a bool.

---

## Data Models:

```typescript
enum EventType {
  MEETUP = "meetup",
  WORKSHOP = "workshop",
  CONFERENCE = "conference",
  OTHER = "other",
}

// interface Posts {
//   title: string;
//   content: string;
//   author: Members;
//   votes: number;
//   createdAt: Date;
// //   updatedAt: Date;
// // }

// interface Content {
//   title: string;
//   content: string;
//   author: Members;
//   votes: number;
//   createdAt: Date;
//   updatedAt: Date;
// }

// interface Members {
//   email: string;
//   firstName: string;
//   lastName: string;
//   membershipStatus: MembershipStatus;
//   joinedDate: Date;
//   country: string;
//   updatedAt: Date;
// }

interface Events {
  title: string;
  description: string;
  date: Date;
  location: string;
  author: Members;
  votes: number;
  createdAt: Date;
  eventType: EventType;
  updatedAt: Date;
}
```

## Pages Needed

- [ ] Home Page
  - [ ] Hero section with simple language and a call to action button
  - [ ] Customer testimonials (maybe a carousel)
  - [ ] Customer video testimonials
  - [ ] Google and Microsoft logos.
  - [ ] Graphic representing the different countries of members
- [ ] Events Page
  - [ ] List of events
  - [ ] Event details page
  - [ ] Event registration page
  - [ ] Event cancellation page
  - [ ] Event payment page
- [ ] Members Page
  - [ ] List of members
  - [ ] Member details page
  - [ ] Member profile page
  - [ ] Member settings page
  - [ ] Member admin page
- [ ] Posts Page
  - [ ] List of posts
  - [ ] Post details page
  - [ ] Post creation page
  - [ ] Post editing page
  - [ ] Post deletion page
- [ ] Content Page
  - [ ] List of content
  - [ ] Content details page
  - [ ] Content creation page
  - [ ] Content editing page
  - [ ] Content deletion page
