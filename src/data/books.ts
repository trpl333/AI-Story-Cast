import type { Book } from '../types';

export const books: Book[] = [
  {
    id: 'alice',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    description:
      'Follow Alice down the rabbit hole into a world of impossibly curious creatures, riddles without answers, and rules that make no sense — unless you look at them sideways.',
    coverGradient: 'from-violet-600 via-purple-500 to-pink-500',
    characters: [
      {
        name: 'Narrator',
        voicePitch: 1.0,
        voiceRate: 0.95,
        color: 'bg-slate-500',
        description: 'The storytelling voice that guides us through Wonderland.',
      },
      {
        name: 'Alice',
        voicePitch: 1.3,
        voiceRate: 1.05,
        color: 'bg-blue-500',
        description: 'Curious, polite, and perpetually bewildered young girl.',
      },
      {
        name: 'White Rabbit',
        voicePitch: 1.5,
        voiceRate: 1.3,
        color: 'bg-amber-500',
        description: 'Perpetually late and anxious; wears a waistcoat and pocket watch.',
      },
      {
        name: 'Cheshire Cat',
        voicePitch: 0.8,
        voiceRate: 0.85,
        color: 'bg-purple-500',
        description: 'Mysterious and philosophical; appears and disappears at will.',
      },
      {
        name: 'Mad Hatter',
        voicePitch: 1.1,
        voiceRate: 1.2,
        color: 'bg-orange-500',
        description: 'Eccentric tea-party host who speaks in riddles.',
      },
      {
        name: 'Queen of Hearts',
        voicePitch: 0.9,
        voiceRate: 1.1,
        color: 'bg-red-500',
        description: 'Tyrannical ruler with one solution to every problem.',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        title: 'Chapter I — Down the Rabbit-Hole',
        paragraphs: [
          {
            id: 'p1',
            text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p2',
            text: 'So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p3',
            text: 'There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself,',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p4',
            text: '"Oh dear! Oh dear! I shall be too late!"',
            isDialogue: true,
            speaker: 'White Rabbit',
          },
          {
            id: 'p5',
            text: 'But when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p6',
            text: 'In another moment down went Alice after it, never once considering how in the world she was to get out again.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p7',
            text: 'The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p8',
            text: 'Either the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p9',
            text: '"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English).',
            isDialogue: true,
            speaker: 'Alice',
          },
          {
            id: 'p10',
            text: 'Down, down, down. Would the fall never come to an end! "I wonder how many miles I\'ve fallen by this time?" she said aloud. "I must be getting somewhere near the centre of the earth. Let me think: that would be four thousand miles down, I think—"',
            isDialogue: false,
            speaker: 'Narrator',
          },
        ],
      },
      {
        id: 'ch2',
        title: 'Chapter II — The Pool of Tears',
        paragraphs: [
          {
            id: 'p11',
            text: '"Curiouser and curiouser!" cried Alice. "Now I\'m opening out like the largest telescope that ever was! Good-bye, feet!"',
            isDialogue: true,
            speaker: 'Alice',
          },
          {
            id: 'p12',
            text: '(for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off). "Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I\'m sure I shan\'t be able!"',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p13',
            text: 'She was rambling on in this way when she heard a little pattering of feet in the distance, and she hastily dried her eyes to see what was coming. It was the White Rabbit returning, splendidly dressed, with a pair of white kid gloves in one hand and a large fan in the other. He was muttering to himself as he came,',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p14',
            text: '"Oh! the Duchess, the Duchess! Oh! won\'t she be savage if I\'ve kept her waiting!"',
            isDialogue: true,
            speaker: 'White Rabbit',
          },
          {
            id: 'p15',
            text: 'Alice felt so desperate that she was ready to ask help of any one; so, when the Rabbit came near her, she began, in a low, timid voice,',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p16',
            text: '"If you please, sir—"',
            isDialogue: true,
            speaker: 'Alice',
          },
          {
            id: 'p17',
            text: 'The Rabbit started violently, dropped the white kid gloves and the fan, and skurried away into the darkness as hard as he could go.',
            isDialogue: false,
            speaker: 'Narrator',
          },
        ],
      },
      {
        id: 'ch3',
        title: 'Chapter VI — Pig and Pepper',
        paragraphs: [
          {
            id: 'p18',
            text: 'For a minute or two she stood looking at the house, and wondering what to do next, when suddenly a footman in livery came running out of the wood—(she considered him to be a footman because he was in livery: otherwise, judging by his face only, she would have called him a fish)—and rapped loudly at the door with his knuckles.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p19',
            text: 'Alice went timidly up to the door, and knocked.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p20',
            text: '"There\'s no sort of use in knocking," said the Footman, "and that for two reasons. First, because I\'m on the same side of the door as you are; secondly, because they\'re making such a noise inside, no one could possibly hear you."',
            isDialogue: true,
            speaker: 'Mad Hatter',
          },
          {
            id: 'p21',
            text: 'Alice opened the door and went in. The door led right into a large kitchen, which was full of smoke from one end to the other: the Duchess was sitting on a three-legged stool in the middle, nursing a baby; the cook was leaning over the fire, stirring a large cauldron which seemed to be full of soup.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p22',
            text: '"Please would you tell me," said Alice, a little timidly, "why your cat grins like that?"',
            isDialogue: true,
            speaker: 'Alice',
          },
          {
            id: 'p23',
            text: '"It\'s a Cheshire cat," said the Duchess, "and that\'s why."',
            isDialogue: true,
            speaker: 'Queen of Hearts',
          },
          {
            id: 'p24',
            text: 'Alice had not the least idea what to say to this: the cook and the baby were both crying loudly; and then there came, from somewhere near by, the most curious of sounds — a low, slow chuckle that seemed to come from everywhere and nowhere.',
            isDialogue: false,
            speaker: 'Narrator',
          },
          {
            id: 'p25',
            text: '"We\'re all mad here," came a slow, drifting voice from the branches above. "I\'m mad. You\'re mad."',
            isDialogue: true,
            speaker: 'Cheshire Cat',
          },
          {
            id: 'p26',
            text: '"How do you know I\'m mad?" said Alice.',
            isDialogue: true,
            speaker: 'Alice',
          },
          {
            id: 'p27',
            text: '"You must be," said the Cat, "or you wouldn\'t have come here."',
            isDialogue: true,
            speaker: 'Cheshire Cat',
          },
        ],
      },
    ],
  },
];

export const companionResponses: Record<string, string> = {
  default:
    "That's a wonderful question! In this passage, Lewis Carroll uses the wonderfully strange logic of Wonderland to explore how we question the rules of the world around us. Alice's bewilderment mirrors our own when we encounter something truly unexpected.",
  alice:
    'Alice is Lewis Carroll\'s classic "everychild" — logical, curious, and polite, yet increasingly assertive as Wonderland challenges her. She represents the rational mind confronting an irrational world.',
  rabbit:
    'The White Rabbit is the catalyst for the entire adventure. His constant anxiety about being late is a parody of Victorian punctuality obsession. Notice how his pocket watch symbolises time — something Wonderland constantly subverts.',
  cat:
    'The Cheshire Cat is one of literature\'s most iconic figures of philosophical ambiguity. Its ability to vanish yet leave behind its grin represents the idea that concepts can outlast the things they describe.',
  hatter:
    "The Mad Hatter's tea party is stuck at 6 o'clock forever — a punishment from Time itself. Carroll uses this to explore how fixation and routine can trap us in endless, meaningless repetition.",
  queen:
    "The Queen of Hearts' constant \"Off with their heads!\" is a satirical take on arbitrary authority. Her power is total but her rule is chaos — a commentary on tyranny masquerading as order.",
  wonderland:
    "Wonderland operates on dream logic — things are true because they're asserted, size is fluid, and identity is constantly questioned. Carroll was ahead of his time in exploring how language shapes reality.",
  curious:
    'Alice\'s famous "curiouser and curiouser" is one of literature\'s most delightful inventions. By making up a word, she demonstrates exactly the kind of free-thinking that Wonderland demands — and rewards.',
  fall:
    "Alice's fall down the rabbit hole is a masterpiece of liminal space. She passes curiosities on the way down but cannot stop to examine them — a perfect metaphor for the transition between the ordinary world and a dream.",
  read:
    "Carroll wrote Alice's Adventures in Wonderland as an oral story told to real children on a boat trip. The book preserves that sense of playful improvisation — each chapter feeling like a fresh surprise.",
};
