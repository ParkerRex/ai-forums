#!/usr/bin/env node
// Comment import script

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEPLOY_KEY = "prod:gallant-rooster-737|eyJ2MiI6IjU3NThhOTFjMDY3NTQ1ZDQ5ODM5YTc3OTVhOWQyMTQxIn0=";
const postIdMap = {};

async function main() {
  const comments = [
  {
    "content": "Good to have you join Jonathan!",
    "createdAt": 1751690817504,
    "updatedAt": 1751902954337,
    "status": "active",
    "postOriginalId": "jd70a3s9wbydmmzbrtq5tx91w97mbwcj",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn70as9x5egsena4e4x0dvag4n7mabcw"
  },
  {
    "content": "[me@iamfiscus.com](mailto:me@iamfiscus.com)",
    "createdAt": 1751401352392,
    "updatedAt": 1751549595397,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j972ypd5vzxetk5tdnn8hafeyh7jgem0",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn70bv9gx3mdchf0r493cxbgqh7ma3ph"
  },
  {
    "content": "Would love to be a part! email: crusoebirkhead@gmail.com",
    "createdAt": 1751511759762,
    "updatedAt": 1751549592141,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j97dwpg1b3166d3pvh9ngb0ec17jhp6m",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn70hfq2cyrhkm1s8psaxga5zx7ma0sm"
  },
  {
    "content": "yes, gdconnect\nlurker",
    "createdAt": 1751263239127,
    "updatedAt": 1751407807412,
    "status": "active",
    "postOriginalId": "jd70cznyc4s4fx3wan1xk612c97mb3qw",
    "memberOriginalId": "j97e43ry7p58swakes7zg9wq4x7jh7r4",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn70qs6qgt32txhjjf3dygfx8s7mbpg3"
  },
  {
    "content": "lets go!!!",
    "createdAt": 1750901652679,
    "updatedAt": 1750910315892,
    "status": "active",
    "postOriginalId": "jd790e1ewffnwa2zyby79np9d17mayyn",
    "memberOriginalId": "j97dgayxq6eqg4tm89kx9bnyfh7jhmcs",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn70zkdhy94xhbg3tr3504mnwx7mb0he"
  },
  {
    "content": "Thanks for being AWESOME yourself @Parker Rex !",
    "createdAt": 1750994197664,
    "updatedAt": 1750999313313,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn715n4wr6x8wx6zmkpr7hka4n7mbfhz"
  },
  {
    "content": "Excited to start exploring",
    "createdAt": 1751843795654,
    "updatedAt": 1751843795654,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j97etcb21mbqdb80wjbzky2s717jg6yf",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn71eq9g18fdbfc5806ht5payn7mb6dc"
  },
  {
    "content": "CC on top.\n[https://www.youtube.com/watch?v=Lon0oRRqB6A](https://www.youtube.com/watch?v=Lon0oRRqB6A)",
    "createdAt": 1751499198157,
    "updatedAt": 1751549584579,
    "status": "active",
    "postOriginalId": "jd786ah1kqabygsksge3115q157mah9h",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn72251n0yt42xny2qd8rfdhw97maq0e"
  },
  {
    "content": "I just made my account, would it still pass the credits or did i have to have the account before hand created?",
    "createdAt": 1750901752073,
    "updatedAt": 1750910312747,
    "status": "active",
    "postOriginalId": "jd790e1ewffnwa2zyby79np9d17mayyn",
    "memberOriginalId": "j97dgayxq6eqg4tm89kx9bnyfh7jhmcs",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn724jxcb5e9ar0x5qmgttz6ts7mb8dz"
  },
  {
    "content": "make sure to share it to #share-your-work in discord",
    "createdAt": 1752087861912,
    "updatedAt": 1752091996106,
    "status": "active",
    "postOriginalId": "jd7542gknkd5kj016pa0h58vs17mbnar",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn72c5exbs03jwx2qm3jmz23d57mb4bd"
  },
  {
    "content": "Hey Jonathan!\n\nCrazy crossover of skills. Happy to have you. Ive spent a fair amount of time working on calendars having rolled my own in the past. Let me know if youre ever up for a chat! Excited to see what youre building. You should join a Show & Tell with us you'd be a great addition to the crew.\n\nCheers",
    "createdAt": 1751903060523,
    "updatedAt": 1751903060523,
    "status": "active",
    "postOriginalId": "jd70a3s9wbydmmzbrtq5tx91w97mbwcj",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn72n03e7d2y7xxbx5q1j7vwbn7mbz6p"
  },
  {
    "content": "Welcome Jonathan! I have a photography background myself. Would love to learn more about the stuff you are working on",
    "createdAt": 1752511327262,
    "updatedAt": 1752511327262,
    "status": "active",
    "postOriginalId": "jd70a3s9wbydmmzbrtq5tx91w97mbwcj",
    "memberOriginalId": "j976z3pej55vnf39v71zh5m6j57jg7jc",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn72vdcd1n1htpshx9xj8gqhh57ma91d"
  },
  {
    "content": "Thanks a million. Received.",
    "createdAt": 1750894619617,
    "updatedAt": 1750910323655,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j97e43ry7p58swakes7zg9wq4x7jh7r4",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn73jhma3m3ktw8w3824bpgy7x7ma24m"
  },
  {
    "content": "WAT?! Can you elaborate on:\n\"2 ppl who made Claude Code just joined the cursor team.\"",
    "createdAt": 1751463724719,
    "updatedAt": 1751463724719,
    "status": "active",
    "postOriginalId": "jd786ah1kqabygsksge3115q157mah9h",
    "memberOriginalId": "j978t1dajy8je6zh30frvm8tsx7jgv0v",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn73snfwhm46kwntw4wxf53n1h7mad0n"
  },
  {
    "content": "Get that demo out !!!!",
    "createdAt": 1752087853256,
    "updatedAt": 1752091995014,
    "status": "active",
    "postOriginalId": "jd7542gknkd5kj016pa0h58vs17mbnar",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn749dy4k2gppq4z8k1hq03mg97mav9n"
  },
  {
    "content": "UPDATED LINK: [https://riverside.fm/studio/parker-rexs-studio?t=ce9a566d9674a95e9d15](https://riverside.fm/studio/parker-rexs-studio?t=ce9a566d9674a95e9d15)",
    "createdAt": 1751554745491,
    "updatedAt": 1751554745491,
    "status": "active",
    "postOriginalId": "jd74c6tnt8qbchyvmpp6mfqqzh7mbvvx",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn749tj64vzen6bj52fb3yn9e57mb3y6"
  },
  {
    "content": "If youre curious to learn more about how Claude Code works, read here: [https://southbridge-research.notion.site/Architecture-The-Engine-Room-2055fec70db18192963cd6b3a5326476](https://southbridge-research.notion.site/Architecture-The-Engine-Room-2055fec70db18192963cd6b3a5326476)",
    "createdAt": 1751463606109,
    "updatedAt": 1751463606109,
    "status": "active",
    "postOriginalId": "jd786ah1kqabygsksge3115q157mah9h",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn74vedggg629bsfs91scpvdqh7mbskq"
  },
  {
    "content": "Can’t see anything in mine",
    "createdAt": 1750918390115,
    "updatedAt": 1750978160089,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j97ew7a2ywg84jdr6gw7evz0fd7jhtv8",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7560pr9x7b10pmykathzyjbn7mbsh9"
  },
  {
    "content": "[https://support.anthropic.com/en/articles/11014257-about-claude-s-max-plan-usage](https://support.anthropic.com/en/articles/11014257-about-claude-s-max-plan-usage)",
    "createdAt": 1751252150086,
    "updatedAt": 1751252150086,
    "status": "active",
    "postOriginalId": "jd70cznyc4s4fx3wan1xk612c97mb3qw",
    "memberOriginalId": "j97e43ry7p58swakes7zg9wq4x7jh7r4",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn758at7x01xbg57c9pe93ve3s7macex"
  },
  {
    "content": "FYI - Mine was received @Parker Rex 👍",
    "createdAt": 1751495815125,
    "updatedAt": 1751501780868,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn75cad5gtre1ff04zts25tx8s7mbdaj"
  },
  {
    "content": "Thanks, @Parker Rex for your effort. Not that it's a deal breaker, but do the credits apply if you're still within the 14 day trial. Thanks!",
    "createdAt": 1750907769199,
    "updatedAt": 1751134363688,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j978t1dajy8je6zh30frvm8tsx7jgv0v",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn75pgec43m1bjjbksf9btmfgs7mb8c0"
  },
  {
    "content": "Sounds really interesting. I am in the drone industry, photogrammetry and lidar for surveying purposes mostly.",
    "createdAt": 1751846770046,
    "updatedAt": 1751902955751,
    "status": "active",
    "postOriginalId": "jd70a3s9wbydmmzbrtq5tx91w97mbwcj",
    "memberOriginalId": "j970rf48vqb4vpq6s3zgrf364x7jh0yg",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn760b963apwb56mawsds1yykd7mb0wd"
  },
  {
    "content": "Look forward to watching it!",
    "createdAt": 1750901784832,
    "updatedAt": 1750910326935,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j97dgayxq6eqg4tm89kx9bnyfh7jhmcs",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn761ecdyk6hvm39jfyrv81gqd7mbq0a"
  },
  {
    "content": "I would like to be onboarded! arnavg2019@email.iimcal.ac.in",
    "createdAt": 1751423525104,
    "updatedAt": 1751549593967,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j972gc451qzvzyfx0hgd3k6t317jht4h",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn765zcnxc9fev7yf6w9vp5j2s7madze"
  },
  {
    "content": "@Josh Coleman - Love the Augment Planning + CC execution workflow. Will you keep paying for both ongoing, or free plan for Augment?",
    "createdAt": 1751499046007,
    "updatedAt": 1751549578621,
    "status": "active",
    "postOriginalId": "jd739aybdswsahwnjev5shgkds7marx0",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn76eh2cdgfe0dqeqzh6zs79nh7mb1fs"
  },
  {
    "content": "Great! Look forward to the interview.",
    "createdAt": 1750899451474,
    "updatedAt": 1750910325295,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j978t1dajy8je6zh30frvm8tsx7jgv0v",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn77t7js55gs1wc5jnzpfa7qpx7mbk5q"
  },
  {
    "content": "I was able to login but am guessing the notice you will send will be where we can update our CC information to continue to be a member of this community @Parker Rex ?",
    "createdAt": 1753325314785,
    "updatedAt": 1753331546071,
    "status": "active",
    "postOriginalId": "jd7d24ne7j1mqf5bne47zr818x7mamgn",
    "memberOriginalId": "j97dgayxq6eqg4tm89kx9bnyfh7jhmcs",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn784ndyyn451a29ahbvey4ah97may6n"
  },
  {
    "content": "🚀",
    "createdAt": 1750794479559,
    "updatedAt": 1750795409367,
    "status": "active",
    "postOriginalId": "jd790e1ewffnwa2zyby79np9d17mayyn",
    "memberOriginalId": "j978t1dajy8je6zh30frvm8tsx7jgv0v",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn78nxw6c0wnng44y93pzyxjn17mbcj8"
  },
  {
    "content": "Thank you so much!",
    "createdAt": 1751099225689,
    "updatedAt": 1751130290089,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j97dpqk331v20fw6kab2bdb7d17maq32",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn78sh64bsn72hy5w6vqbfdbrh7ma29v"
  },
  {
    "content": "Keen to help.",
    "createdAt": 1751496314466,
    "updatedAt": 1751549589681,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn79km9p1e97z0tfzm4kv4tpg17mbcav"
  },
  {
    "content": "Congrats! Yes, my skool email is content@helpsmin.com",
    "createdAt": 1751428003417,
    "updatedAt": 1751549591101,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j970tqg8n6sqxm0yfxa2v963b97jgmsb",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn79qdb3z7qbr038qvxn8rr3t17may7s"
  },
  {
    "content": "we'll be here",
    "createdAt": 1752246957860,
    "updatedAt": 1752246957860,
    "status": "active",
    "postOriginalId": "jd7eqvbcxmerhb5rxjmz2462dd7mawmd",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn79ztqsk927n3pe2dx4v63cwx7mawqj"
  },
  {
    "content": "dustinw@flywheelaec.com",
    "createdAt": 1751909231253,
    "updatedAt": 1751909231253,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j970rf48vqb4vpq6s3zgrf364x7jh0yg",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7a8sq0jc1v5zsaq9vqzndcy17mbwva"
  },
  {
    "content": "[https://x.com/amir/status/1940112288381641026](https://x.com/amir/status/1940112288381641026)",
    "createdAt": 1751464983862,
    "updatedAt": 1751464983862,
    "status": "active",
    "postOriginalId": "jd786ah1kqabygsksge3115q157mah9h",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7acem6v375w293n20byxcrm57mb8na"
  },
  {
    "content": "@Jd Fiscus - Curious if you have any magic MCP workflows for design with Figma?",
    "createdAt": 1751498872539,
    "updatedAt": 1751549543336,
    "status": "active",
    "postOriginalId": "jd739aybdswsahwnjev5shgkds7marx0",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7akvhc4ejzadj1r34nk5nmp17majj7"
  },
  {
    "content": "I'm down!",
    "createdAt": 1751463909500,
    "updatedAt": 1751549590291,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j972mfs2c9w1htwdtsktgtx2c17mbevq",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7arpm11t4gvhta4m4trjhbqs7mbg3q"
  },
  {
    "content": "This is my story also. Great to have you join!",
    "createdAt": 1752024177887,
    "updatedAt": 1752080576949,
    "status": "active",
    "postOriginalId": "jd7bng5ze2xetn22rtvskjvaf57ma7xv",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7ay3nj7j295ahwqe5yb1xd9n7mbjmc"
  },
  {
    "content": "@Jason Chiang - You never got to share any AWS AI-Guy sauce..?",
    "createdAt": 1751498901789,
    "updatedAt": 1751553373932,
    "status": "active",
    "postOriginalId": "jd739aybdswsahwnjev5shgkds7marx0",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7b7ct2qkjfv93fwhh0mq7k4s7mb52j"
  },
  {
    "content": "Great chat team thank you for all you shared!\n@Nicolas Peralta Baron @Jeff Boothe @Trent Swords @Jason Chiang @Josh Coleman @Shane Griffiths @Dimitri Pietersz @Jd Fiscus @Crusoe Birkhead",
    "createdAt": 1751498816621,
    "updatedAt": 1751616126325,
    "status": "active",
    "postOriginalId": "jd739aybdswsahwnjev5shgkds7marx0",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7b80b7fqr7at56cd9fsn62s57mb4y7"
  },
  {
    "content": "💯 Cat (PM) and Boris (Founding Eng.) seemed to have moved together. Hard for me to imagine or understand, other than if there were internal culture issues at Anthropic that they wanted out from. But maybe anyone can be tempted by 💸. It's encouraging to me that they moved together as they seem to be a uniquely creative pairing.",
    "createdAt": 1751496196560,
    "updatedAt": 1751496196560,
    "status": "active",
    "postOriginalId": "jd786ah1kqabygsksge3115q157mah9h",
    "memberOriginalId": "j977wpr9va2ebb4yfvqxwavp617jhrhp",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7bjrkyhxbmnkag05dte1czsd7mbkvs"
  },
  {
    "content": "Welcome Jonathan",
    "createdAt": 1752237499157,
    "updatedAt": 1752237499157,
    "status": "active",
    "postOriginalId": "jd70a3s9wbydmmzbrtq5tx91w97mbwcj",
    "memberOriginalId": "j973gnk0rr30t94kws09r0gyvx7jh5hh",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7c2qe1kcyjzt5j1sc8ncwshx7mbgjj"
  },
  {
    "content": "I'd like to check it out as well, jonathan@stokkland.com",
    "createdAt": 1751759836064,
    "updatedAt": 1751759836064,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j975ncs951g0z7dtnxef0znqkx7kcp25",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7chtca4dchhg0a4a3gn1vyxd7mbcvc"
  },
  {
    "content": "update on this -- 11 tickets squashed. still grinding. if you go signup it should all work :)",
    "createdAt": 1753331573191,
    "updatedAt": 1753331573191,
    "status": "active",
    "postOriginalId": "jd7d24ne7j1mqf5bne47zr818x7mamgn",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7cjwb55gbkhywxe0nwgkzn017mbm07"
  },
  {
    "content": "@Parker Rex thanks much. I can't see mine either (developer@helpsmin.com). Do I need to start a free trial account first before I can see it?",
    "createdAt": 1751082868940,
    "updatedAt": 1751428289196,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j970tqg8n6sqxm0yfxa2v963b97jgmsb",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7cqbaeg0f835x47nqkf4848h7mamxb"
  },
  {
    "content": "excited for you :\\]\n\nKnow we already chatted about this on discord but... keep building things and shipping them! fastest way to learn/level up!",
    "createdAt": 1752023665504,
    "updatedAt": 1752080575816,
    "status": "active",
    "postOriginalId": "jd7bng5ze2xetn22rtvskjvaf57ma7xv",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7dzfxjaatq8few2yymge3tvx7ma22r"
  },
  {
    "content": "Count me in, excited to see what you've built. :)",
    "createdAt": 1752001023582,
    "updatedAt": 1753478881061,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j97bwc2fxyj6yppkk89bhwmb4x7kdpe8",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7dzrd45fvzjtmn2z8ch95x017ma1ds"
  },
  {
    "content": "Thanks! Hell yeah, I'm excited to be doing something that I enjoy and hoping pursuing this hobby alongside like-minded people can become more for us all! \"A rising tide lifts all boats\"",
    "createdAt": 1752080840673,
    "updatedAt": 1753478881157,
    "status": "active",
    "postOriginalId": "jd7bng5ze2xetn22rtvskjvaf57ma7xv",
    "memberOriginalId": "j97bwc2fxyj6yppkk89bhwmb4x7kdpe8",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7erwh3pyv3a1xzwtn203pzrd7mbg4v"
  },
  {
    "content": "@Jeff Boothe",
    "createdAt": 1751464928368,
    "updatedAt": 1751464928368,
    "status": "active",
    "postOriginalId": "jd786ah1kqabygsksge3115q157mah9h",
    "memberOriginalId": "j978dznck6t7a50rz6kfq1ah0h7jktpw",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7etnb5b2f5wrhts5f5mx16w57ma2gs"
  },
  {
    "content": "Where can we see the credits? I don't think I received them as I am using [orakemu@gmail.com](mailto:orakemu@gmail.com) and not [yorgohoebeke@gmail.com](mailto:yorgohoebeke@gmail.com)",
    "createdAt": 1751290937487,
    "updatedAt": 1751379028644,
    "status": "active",
    "postOriginalId": "jd70akkv7hnnfwd1t82pmz5f0n7mah29",
    "memberOriginalId": "j97br0agr49dfmwehg32k2k0z17jg30z",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7f264v7hdzyntpwaqbns5nxd7mab35"
  },
  {
    "content": "amazing thanks !!!",
    "createdAt": 1751027784162,
    "updatedAt": 1751027784162,
    "status": "active",
    "postOriginalId": "jd790e1ewffnwa2zyby79np9d17mayyn",
    "memberOriginalId": "j97beay5sccx18mg90h0wmq0e57jhzxh",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7f3gs185xtbe807k9px0s1497mbafa"
  },
  {
    "content": "Let’s gooo! aman@kriolabs.com",
    "createdAt": 1751400137970,
    "updatedAt": 1751549595896,
    "status": "active",
    "postOriginalId": "jd76z22hby8bgzf532jktaeemx7maqpj",
    "memberOriginalId": "j971veaw9pyyjjv2b483mjey517jg6r0",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7fgvd51v76ne1sp77fmmf84h7mb3hr"
  },
  {
    "content": "Are you on discord?",
    "createdAt": 1751262858947,
    "updatedAt": 1751401696310,
    "status": "active",
    "postOriginalId": "jd70cznyc4s4fx3wan1xk612c97mb3qw",
    "memberOriginalId": "j975ma0ns75hakt2zzhx1a1g9x7jg0b0",
    "upvotes": 0,
    "downvotes": 0,
    "netVotes": 0,
    "depth": 0,
    "childCount": 0,
    "mentions": [],
    "_originalId": "jn7fzzn836799nrdgc74sfdnjh7ma7hm"
  }
];
  
  console.log(`\n💬 Importing ${comments.length} comments...`);
  
  let imported = 0;
  let failed = 0;
  const errors = [];
  
  // Process comments in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing comment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(comments.length / BATCH_SIZE)}`);
    
    const commentsToImport = batch.map(comment => ({
      content: comment.content,
      authorEmail: comment.authorEmail || "",
      postSkoolId: comment.postOriginalId,
      parentSkoolId: comment.parentCommentOriginalId,
      createdAt: comment.createdAt || comment._creationTime,
      updatedAt: comment.updatedAt,
      likes: comment.netVotes || 0,
      skoolId: comment._originalId
    }));
    
    const args = {
      comments: commentsToImport,
      postIdMap: postIdMap
    };
    
    try {
      const argsJson = JSON.stringify(args);
      const command = `CONVEX_DEPLOY_KEY="${DEPLOY_KEY}" npx convex run importPostsComments:importCommentsBatch '${argsJson.replace(/'/g, "'\"'\"'")}'`;
      
      const output = execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        cwd: path.join(__dirname, '..')
      });
      
      // Parse result
      const lines = output.trim().split('\n');
      let result = null;
      for (let j = lines.length - 1; j >= 0; j--) {
        if (lines[j].trim().startsWith('{')) {
          try {
            result = JSON.parse(lines[j]);
            break;
          } catch (e) {
            // Continue
          }
        }
      }
      
      if (result && result.importedCount) {
        imported += result.importedCount;
        console.log(`✅ Imported ${result.importedCount} comments`);
      } else {
        failed += batch.length;
        console.log(`❌ Failed to import batch`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      failed += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Comment import completed!`);
  console.log(`   Imported: ${imported}/${comments.length}`);
  console.log(`   Failed: ${failed}`);
}

main().catch(console.error);
