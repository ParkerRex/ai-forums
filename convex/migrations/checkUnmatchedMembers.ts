import { query } from "../_generated/server";

// List of emails from the CSV
const csvEmails = [
  "aemaes@gmail.com", "david.manibod@gmail.com", "ryanleerhodes@gmail.com", "rileyrmahoney@gmail.com",
  "kyle.m.marks@icloud.com", "nichhagan@gmail.com", "dominicgaleno@gmail.com", "thudson01@gmail.com",
  "tomas@koi.ventures", "satharus@gmail.com", "nithingowda30@gmail.com", "henryconnolly2000@gmail.com",
  "siobhan@siobhanquinn.com", "hiramclark@gmail.com", "wunderbug@gmail.com", "samkodes@gmail.com",
  "contact@maddynguyen.com", "j.michael.s@outlook.com", "arnavg2019@email.iimcal.ac.in", "matt@mattjdavidson.com",
  "taylor@growthsaloon.com", "cczaban@zerothprinciples.ai", "michael.j.tier@gmail.com", "jasen@glowing.io",
  "rick.kieffer@gmail.com", "davidram3rd@gmail.com", "morrisonb84@gmail.com", "micah.davis@letsmake.com",
  "james.loesch2@gmail.com", "schuilenburgchris@gmail.com", "merlin.floyd@gmail.com", "dtedesco1@gmail.com",
  "pietersz@gmail.com", "joe.hosemann@gmail.com", "josh@gracefulbydesign.com", "douglasdrew11@gmail.com",
  "ceo@getdatazen.com", "jschon@jschon.net", "javie@javierios.com", "andrewjohnharvey@gmail.com",
  "chensok@gmail.com", "anomalia.research@gmail.com", "mike@makeshapes.com", "mtorrescohencol@gmail.com",
  "seltzdesign@protonmail.com", "henrik@thepia.net", "corey@cmetech.io", "orakemu@gmail.com",
  "maximacademic@gmail.com", "romneycola@romeai.io", "bxbxbxbxbxr@gmail.com", "trent.swords@gmail.com",
  "martin.martinez.mit@gmail.com", "j.te@nimbuscoreconnect.nl", "alekellegard@protonmail.com",
  "dustinw@flywheelaec.com", "davidp@brazenconsulting.co", "dev@webzi.ai", "willjoemo@gmail.com",
  "gbatesy@gmail.com", "guilherme1237@gmail.com", "contextsurfer@gmail.com", "hunterlapeyre@yahoo.com",
  "rick@pixelpod.co.uk", "me@iamfiscus.com", "joe.kim@gmail.com", "cje.amaya@gmail.com",
  "xamfifa@gmail.com", "danclark31101@gmail.com", "jacobsonoconnor@gmail.com", "christian@devcontainer.io",
  "vamosjoaosilva@gmail.com", "snyedmd@outlook.com", "jakenicholas.mgmt@gmail.com", "muttahar127@gmail.com",
  "david@uhostx.com", "gdconnect@gmail.com", "pierre@cyberscaling.com", "skool.zlazj@passmail.net",
  "rathiharivansh@gmail.com", "robertogcb12@gmail.com", "cdragobusiness@gmail.com", "npbaron97@gmail.com",
  "pb@mintaveinc.com", "aiden@aidenhooper.com", "me@parkerrex.com"
];

export const checkUnmatchedMembers = query({
  args: {},
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();
    
    // Find members not in CSV
    const membersNotInCSV = allMembers.filter(m => !csvEmails.includes(m.email));
    
    // Find CSV emails not in database
    const membersInDB = allMembers.map(m => m.email);
    const csvEmailsNotInDB = csvEmails.filter(email => !membersInDB.includes(email));
    
    return {
      membersNotInCSV: membersNotInCSV.map(m => ({
        email: m.email,
        name: `${m.firstName} ${m.lastName}`,
        tier: m.tier,
        subscriptionStatus: m.subscriptionStatus,
        joinedDate: m.joinedDate ? new Date(m.joinedDate).toLocaleDateString() : "N/A",
      })),
      csvEmailsNotInDB,
      totalInDB: allMembers.length,
      totalInCSV: csvEmails.length,
    };
  },
});