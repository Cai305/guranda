// Seed content for Truth or Dare / Spin the Bottle / Couples Cards.
//
// Content notes:
// - SWEET: playful, safe for any relationship stage.
// - FLIRTY: romantic and mildly suggestive — PG-13.
// - SPICY: intimate and adult-themed, written suggestively rather than
//   graphically. This is deliberate: SPICY only ever unlocks for a couple
//   where both partners have opted in AND both have a verified 18+
//   dateOfBirth (see CouplesService.isSpicyUnlocked), and even then the
//   tone stays evocative rather than explicit — consistent with what's
//   commercially sold as "adult" couples' card decks, and necessary for
//   the app to stay within Google Play / Apple App Store content policy.
export type PromptType = 'TRUTH' | 'DARE' | 'CARD';
export type SpiceLevelSeed = 'SWEET' | 'FLIRTY' | 'SPICY';

export const SEED_PROMPTS: Record<PromptType, Record<SpiceLevelSeed, string[]>> = {
  TRUTH: {
    SWEET: [
      "What's your favorite memory of us together?",
      'What first made you notice me?',
      "What's a silly nickname you'd give me?",
      "What's your favorite thing about our date nights?",
      'What song reminds you of us?',
      'What is one thing I do that always makes you smile?',
      "What's your idea of a perfect lazy Sunday with me?",
      "What's a small thing I do that you secretly love?",
      "What's your favorite way to be comforted when you're stressed?",
      "What's one dream you'd love for us to chase together?",
      "What's the funniest thing that's happened to us as a couple?",
      'What is your love language, and do I speak it well?',
    ],
    FLIRTY: [
      'What was the first thing you noticed about me physically?',
      'What outfit of mine do you secretly love the most?',
      "What's a compliment you've been wanting to give me but haven't?",
      "Where's your favorite place to be kissed?",
      "What's a flirty text you've wanted to send but held back?",
      'What is one thing about me you find irresistible?',
      "What's your favorite way I show you affection?",
      'If we could recreate any romantic movie scene, which one?',
      "What's something I do that instantly gets your attention?",
      'What was the moment you realized you were falling for me?',
      "What's your favorite compliment I've ever given you?",
      'What cute habit of mine drives you a little wild?',
    ],
    SPICY: [
      "What's a fantasy you've never told me about?",
      "What's one thing you'd love for me to do more of when we're alone?",
      "Where's somewhere new you'd want us to be intimate?",
      "What's your favorite way for me to touch you?",
      'What do you find irresistibly attractive about my body?',
      'What moment between us still makes your heart race?',
      'What outfit — or lack of one — drives you wild?',
      "What's one thing you'd want to try together in the bedroom?",
      "What's your favorite way for a night together to start?",
      'What memory of us do you replay in your mind most?',
      'What turns you on the most about me?',
      'If you could plan our next night together, what would it look like?',
    ],
  },
  DARE: {
    SWEET: [
      'Give your partner a genuine compliment right now.',
      'Hold hands and share your favorite memory together.',
      'Write a short love note and read it out loud.',
      'Do a silly dance together for 30 seconds.',
      'Take a selfie together making your goofiest face.',
      "Give your partner a 1-minute shoulder rub.",
      "Slow dance together to a song of your partner's choice.",
      "Tell your partner three things you're grateful for about them.",
      "Recreate your first date's opening line.",
      'Give your partner a piggyback ride around the room.',
      'Feed your partner a bite of something sweet.',
      "Whisper your favorite thing about your partner in their ear.",
    ],
    FLIRTY: [
      'Give your partner a slow, lingering kiss.',
      "Whisper something flirty in your partner's ear.",
      'Give your partner a 2-minute massage anywhere they choose.',
      'Slow dance close together with no space between you.',
      "Trace your fingers along your partner's arm and describe how it feels.",
      'Give your partner three kisses in three different spots.',
      'Hold eye contact for 30 seconds without laughing.',
      'Describe what you find most attractive about your partner right now.',
      'Give your partner a hug and hold it for a full minute.',
      'Let your partner pick a song and slow dance cheek to cheek.',
      "Kiss your partner's neck softly.",
      'Tell your partner exactly what you want to do together tonight.',
    ],
    SPICY: [
      'Give your partner a slow massage anywhere they ask, taking your time.',
      "Kiss your partner somewhere you don't usually kiss them.",
      "Whisper your favorite fantasy about tonight in your partner's ear.",
      "Slowly undress one item of your partner's clothing.",
      'Let your partner guide your hands wherever they want them.',
      'Give your partner a long, deep kiss and let it linger.',
      'Describe out loud exactly what you want to do next.',
      "Trail kisses from your partner's neck down to their collarbone.",
      'Let your partner blindfold you for the next dare.',
      "Give your partner a slow dance just for them, up close.",
      'Whisper what you want your partner to do to you next.',
      'Take turns removing one item of clothing until the next draw.',
    ],
  },
  CARD: {
    SWEET: [
      "Share one thing you're looking forward to doing together this month.",
      'Describe your partner in three words.',
      'Share your favorite inside joke together.',
      "Plan a mini adventure you'll go on this weekend.",
      "Share a compliment you've never said out loud before.",
      'Describe the moment you knew this relationship was different.',
      'Share your favorite way to spend a rainy day together.',
      'Talk about a goal you want to achieve together this year.',
      "Share your favorite thing your partner has cooked or made for you.",
      'Describe your dream vacation together.',
      "Share a childhood memory your partner might not know.",
      'Talk about what "home" means to you when you\'re together.',
    ],
    FLIRTY: [
      'Share the moment you found your partner most attractive.',
      'Describe your ideal romantic evening together.',
      'Share a flirty memory from early in your relationship.',
      "Talk about your partner's best physical feature.",
      "Share what you'd wear on a surprise date night just for them.",
      'Describe the last time your partner made your heart skip.',
      "Talk about a place you'd love to sneak away for a romantic weekend.",
      "Share what you find most magnetic about your partner's personality.",
      'Describe your favorite way to be surprised by your partner.',
      'Talk about a song that makes you think of romance with your partner.',
      "Share one thing you'd love your partner to wear for you.",
      'Describe the most romantic thing your partner has ever done.',
    ],
    SPICY: [
      "Share a fantasy you'd love to act out together.",
      'Describe in detail what you want to do together tonight.',
      "Talk about a place you'd love to be intimate together that you've never tried.",
      'Share what you find most irresistible when your partner takes the lead.',
      'Describe your favorite way a night together has ever started.',
      "Talk about something you've always wanted to try but never asked for.",
      'Share what you love most about being close to your partner physically.',
      'Describe the moment desire for your partner hit you hardest.',
      'Talk about how you want your partner to surprise you tonight.',
      'Share what "getting lost in each other" means to you.',
      'Describe your idea of the perfect intimate night in.',
      'Talk about what makes you feel most desired by your partner.',
    ],
  },
};
