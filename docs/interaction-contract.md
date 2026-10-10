# Child Mode interaction contract

Every Child Mode screen must pass these ten rules. Design review and QA check against this list.
The rules marked **(tested)** are enforced by `test/contract.test.ts` or `test/engine.test.ts`.

1. **Break is always in the same place.** Top right, every screen, labeled with an icon and a word. It opens Help, Break, No and All done. **(tested)**
2. **Next is never blocked.** Tapping the picture, picking an option or communicating is invited, never required. **(tested)**
3. **Controls keep their place.** Back bottom left, Again bottom center, Next bottom right. Hear appears only when narration is on. **(tested)**
4. **One picture, one action.** Each step shows one scene and one highlighted focal object.
5. **Feedback names what happened.** A different pick gets "That is blue." and a soft outline on the target. No red, no buzz, no X. **(tested)**
6. **Choices are respected.** Break pauses with no timer. No offers "Something else". All done goes home quietly. The log labels each one as a choice. **(tested)**
7. **Nothing starts on its own.** No autoplay, no surprise transitions. Sound plays only after a tap, and only if an adult turned it on. A step moves on by itself only after the child has done it, after a short pause, never while Break is open, and a grown-up can turn this off ("Wait for Next"). **(tested)**
8. **Nothing celebrates.** Completion is a calm "All done" with Again, Home and Up next. No confetti, stars or streaks. **(tested)**
9. **Pictures carry every step.** Words can be turned off without losing meaning. Color is never the only cue for navigation. **(tested)**
10. **The child can always leave.** The grown-up check guards settings but never traps the child in a lesson. **(tested)**

## Lesson acceptance criteria

For every lesson (`test/engine.test.ts`, `describe.each(LESSONS)`):

- Opens straight on the first step, and completes start to finish using only Next, at every difficulty
- Every step has a caption and a drawing at all three detail levels
- Again resets the step without logging anything
- Short version and individually hidden steps play in the right order

Asking for help:

- Each of the four choices leads to a scene where it is honored
- Skipping the choice with Next shows "You can ask any time." and nothing else

Grocery store: the basket and list panel shows each pick; things not on the list are named, not counted;
checkout puts exactly the basket's contents on the belt. Wood blocks: Medium and Hard accept only the next
block in the picture and name the one it shows.

Still checked by hand: completes with words, sound and motion off on a real iPad; works offline after
first load (service worker, production build only); the focal object keeps its place across detail levels.
