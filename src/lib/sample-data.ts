import { JeopardyGame } from '@/types/jeopardy';

export const sampleBilingualGame: JeopardyGame = {
  id: 'sample-digital-tech-1',
  title: 'Digital Technology / Teicneolaíocht Dhigiteach',
  subject: 'Computer Science & Technology',
  description: 'Bilingual Leaving Certificate & Junior Cycle Digital Technology Game covering storage, binary, hardware, networks and cybersecurity.',
  rounds: [
    {
      id: 'round-1',
      roundNumber: 1,
      name_en: 'Jeopardy Round',
      name_ga: 'Babhta 1: Jeopardy',
      categories: [
        {
          id: 'cat-storage',
          name_en: 'Storage Units',
          name_ga: 'Aonaid Stórála',
          questions: [
            {
              id: 'q-101',
              points: 100,
              clue_en: 'This is the smallest unit of data storage in computing, capable of storing only a 0 or 1.',
              clue_ga: 'Is é seo an t-aonad stórála sonraí is lú sa ríomhaireacht, nach bhfuil in ann ach 0 nó 1 a stóráil.',
              answer_en: 'What is a bit?',
              answer_ga: 'Cad é giotán (bit)?',
              explanation_en: 'Binary digit (bit) is the foundational building block of digital data.',
              explanation_ga: 'Is é an digit dhénártha (giotán) bunchloch na sonraí digiteacha.'
            },
            {
              id: 'q-102',
              points: 200,
              clue_en: 'Eight bits grouped together form this standard unit of storage.',
              clue_ga: 'Cruthaíonn ocht ngiotán le chéile an t-aonad caighdeánach stórála seo.',
              answer_en: 'What is a byte?',
              answer_ga: 'Cad é beart (byte)?',
              explanation_en: 'A byte can represent 256 different values (2^8).',
              explanation_ga: 'Is féidir le beart 256 luach ar leith a léiriú (2^8).'
            },
            {
              id: 'q-103',
              points: 300,
              clue_en: 'This unit equals 1,024 Megabytes or approximately one billion bytes.',
              clue_ga: 'Tá an t-aonad seo cothrom le 1,024 Meigibheart nó thart ar billiún beart.',
              answer_en: 'What is a Gigabyte (GB)?',
              answer_ga: 'Cad é Gigibheart (GB)?',
              explanation_en: '1 GB = 1024 MB in binary system (Gibibytes) or 10^9 bytes.',
              explanation_ga: '1 GB = 1024 MB sa chóras dénártha nó 10^9 beart.'
            },
            {
              id: 'q-104',
              points: 400,
              clue_en: 'This type of high-speed primary memory is volatile and loses its contents when powered down.',
              clue_ga: 'Tá an cineál cuimhne phríomhúil ardluais seo luaineach agus cailleann sé a chuid sonraí nuair a mhúchtar an chumhacht.',
              answer_en: 'What is RAM (Random Access Memory)?',
              answer_ga: 'Cad é RAM (Cuimhne Randamrochtana)?',
              explanation_en: 'RAM stores data and machine code currently being used.',
              explanation_ga: 'Stórálann RAM sonraí agus cód meaisín atá in úsáid faoi láthair.'
            },
            {
              id: 'q-105',
              points: 500,
              clue_en: 'This modern storage device uses flash memory chips instead of spinning magnetic platters.',
              clue_ga: 'Úsáideann an gléas nua-aimseartha stórála seo sliseanna cuimhne splaince in ionad plátaí maighnéadacha rothlacha.',
              answer_en: 'What is an SSD (Solid State Drive)?',
              answer_ga: 'Cad é SSD (Tiomántán Soladstaide)?',
              explanation_en: 'SSDs have no moving mechanical components, offering faster read/write speeds.',
              explanation_ga: 'Níl aon pháirteanna gluaisteacha ag SSDanna, rud a fhágann go bhfuil siad i bhfad níos tapúla.'
            }
          ]
        },
        {
          id: 'cat-binary',
          name_en: 'Binary Basics',
          name_ga: 'Bunús Dénártha',
          questions: [
            {
              id: 'q-201',
              points: 100,
              clue_en: 'The number of distinct values that can be represented using exactly 3 bits.',
              clue_ga: 'An líon luachanna sainiúla is féidir a léiriú le díreach 3 ghiotán.',
              answer_en: 'What is 8? (2^3 = 8)',
              answer_ga: 'Cad é 8? (2^3 = 8)',
              explanation_en: 'With n bits, you can represent 2^n unique values (0 to 7).',
              explanation_ga: 'Le n giotán, is féidir 2^n luach a léiriú (0 go 7).'
            },
            {
              id: 'q-202',
              points: 200,
              clue_en: 'The decimal (denary) value of the binary number 00001010.',
              clue_ga: 'Luach deachúil na huimhreach dénártha 00001010.',
              answer_en: 'What is 10?',
              answer_ga: 'Cad é 10?',
              explanation_en: '8 + 2 = 10 in base 10.',
              explanation_ga: '8 + 2 = 10 i mbun 10.'
            },
            {
              id: 'q-203',
              points: 300,
              clue_en: 'This logic gate outputs 1 (True) only when both of its inputs are 1 (True).',
              clue_ga: 'Ní tháirgeann an geata loighce seo 1 (Fíor) ach amháin nuair atá an dá ionchur cothrom le 1 (Fíor).',
              answer_en: 'What is an AND gate?',
              answer_ga: 'Cad é geata AGUS (AND gate)?',
              explanation_en: 'An AND gate requires all inputs to be high.',
              explanation_ga: 'Éilíonn geata AGUS go mbeadh gach ionchur ard.'
            },
            {
              id: 'q-204',
              points: 400,
              clue_en: 'This numbering system uses base 16, employing digits 0-9 and letters A-F to simplify binary representations.',
              clue_ga: 'Úsáideann an córas uimhrithe seo bun 16, ag baint úsáide as digití 0-9 agus litreacha A-F chun dénártha a shimpliú.',
              answer_en: 'What is Hexadecimal?',
              answer_ga: 'Cad é Heicsidheachúil (Hexadecimal)?',
              explanation_en: 'One hexadecimal digit cleanly represents exactly 4 binary bits (a nibble).',
              explanation_ga: 'Léiríonn digit heicsidheachúil amháin díreach 4 ghiotán dhénártha.'
            },
            {
              id: 'q-205',
              points: 500,
              clue_en: 'This standard character encoding scheme originally used 7 bits to represent 128 English characters.',
              clue_ga: 'Baineadh úsáid as 7 ngiotán sa scéim ionchódaithe carachtar seo ar dtús chun 128 carachtar a léiriú.',
              answer_en: 'What is ASCII?',
              answer_ga: 'Cad é ASCII?',
              explanation_en: 'American Standard Code for Information Interchange.',
              explanation_ga: 'Cód Caighdeánach Meiriceánach d\'Idirmhalartú Faisnéise.'
            }
          ]
        },
        {
          id: 'cat-hardware',
          name_en: 'Computer Architecture',
          name_ga: 'Ailtireacht Ríomhaireachta',
          questions: [
            {
              id: 'q-301',
              points: 100,
              clue_en: 'Often called the "brain" of the computer, this chip executes instructions.',
              clue_ga: 'Tugtar "inchinn" an ríomhaire air go minic; feidhmíonn an sliseog seo treoracha.',
              answer_en: 'What is the CPU (Central Processing Unit)?',
              answer_ga: 'Cad é an LAP (Lár-Aonad Próiseála / CPU)?',
              explanation_en: 'The CPU performs the Fetch-Decode-Execute cycle.',
              explanation_ga: 'Feidhmíonn an LAP an timthriall Faigh-Díchódaigh-Rith.'
            },
            {
              id: 'q-302',
              points: 200,
              clue_en: 'The component inside the CPU responsible for performing arithmetic and comparison operations.',
              clue_ga: 'An chomhpháirt taobh istigh den LAP atá freagrach as oibríochtaí uimhríochta agus comparáide a dhéanamh.',
              answer_en: 'What is the ALU (Arithmetic Logic Unit)?',
              answer_ga: 'Cad é an AUL (Aonad Uimhríochta agus Loighce)?',
              explanation_en: 'The Arithmetic Logic Unit handles all math and boolean operations.',
              explanation_ga: 'Láimhseálann an tAonad Uimhríochta agus Loighce gach oibríocht mhatamaiticiúil agus bhaghannach.'
            },
            {
              id: 'q-303',
              points: 300,
              clue_en: 'Small, ultra-fast memory locations situated directly inside the CPU processor.',
              clue_ga: 'Suíomhanna beaga cuimhne sár-luatha atá suite go díreach taobh istigh den phróiseálaí LAP.',
              answer_en: 'What are Registers?',
              answer_ga: 'Cad iad Cláir (Registers)?',
              explanation_en: 'Registers like the Accumulator (ACC) and Program Counter (PC) hold immediate data.',
              explanation_ga: 'Coinníonn cláir sonraí agus treoracha láithreacha don phróiseálaí.'
            },
            {
              id: 'q-304',
              points: 400,
              clue_en: 'This internal bus transmits the memory addresses from the CPU to RAM.',
              clue_ga: 'Tarchuireann an bus inmheánach seo seoltaí cuimhne ón LAP go dtí an RAM.',
              answer_en: 'What is the Address Bus?',
              answer_ga: 'Cad é an Bus Seoltaí (Address Bus)?',
              explanation_en: 'The address bus is unidirectional, traveling from CPU to memory.',
              explanation_ga: 'Is bus aontreoch é an bus seoltaí ón LAP go dtí an chuimhne.'
            },
            {
              id: 'q-305',
              points: 500,
              clue_en: 'The classic computer architecture where both data and programs are stored together in the same memory space.',
              clue_ga: 'An ailtireacht ríomhaireachta chlasaiceach ina stóráiltear sonraí agus cláir le chéile sa spás cuimhne céanna.',
              answer_en: 'What is the Von Neumann Architecture?',
              answer_ga: 'Cad é Ailtireacht Von Neumann?',
              explanation_en: 'Proposed by John von Neumann in 1945, using a shared memory for code and data.',
              explanation_ga: 'Molta ag John von Neumann i 1945 le cuimhne roinnte do threoracha agus do shonraí.'
            }
          ]
        },
        {
          id: 'cat-networks',
          name_en: 'Networks & Web',
          name_ga: 'Líonraí & Idirlíon',
          questions: [
            {
              id: 'q-401',
              points: 100,
              clue_en: 'A network connecting computers across a small geographical area like a school or single building.',
              clue_ga: 'Líonra a cheanglaíonn ríomhairí thar limistéar beag tíreolaíoch ar nós scoile nó foirgnimh aonair.',
              answer_en: 'What is a LAN (Local Area Network)?',
              answer_ga: 'Cad é LAN (Líonra Ceantair Áitiúil)?',
              explanation_en: 'Local Area Networks provide high bandwidth over short distances.',
              explanation_ga: 'Soláthraíonn LAN ard-bandaleithead thar achair ghearra.'
            },
            {
              id: 'q-402',
              points: 200,
              clue_en: 'A unique numeric identifier assigned to every device connected to an IP network.',
              clue_ga: 'Aitheantóir uimhriúil uathúil a shanntar do gach gléas atá nasctha le líonra IP.',
              answer_en: 'What is an IP Address?',
              answer_ga: 'Cad é Seoladh IP?',
              explanation_en: 'IPv4 uses 32 bits (4 numbers separated by dots), IPv6 uses 128 bits.',
              explanation_ga: 'Úsáideann IPv4 32 giotán agus úsáideann IPv6 128 giotán.'
            },
            {
              id: 'q-403',
              points: 300,
              clue_en: 'This networking hardware device routes packets of data between different computer networks.',
              clue_ga: 'Treoraíonn an gléas crua-earraí líonraithe seo paicéid sonraí idir líonraí ríomhaireachta éagsúla.',
              answer_en: 'What is a Router?',
              answer_ga: 'Cad é Ródair (Router)?',
              explanation_en: 'Routers inspect destination IP addresses and direct packets efficiently.',
              explanation_ga: 'Scrúdaíonn ródairí seoltaí IP cinn scríbe agus seolann siad paicéid ar aghaidh.'
            },
            {
              id: 'q-404',
              points: 400,
              clue_en: 'This foundational internet protocol translates human-readable domain names (like google.com) into numerical IP addresses.',
              clue_ga: 'Aistríonn an prótacal idirlín bunúsach seo ainmneacha fearainn inléite (ar nós google.com) go seoltaí uimhriúla IP.',
              answer_en: 'What is DNS (Domain Name System)?',
              answer_ga: 'Cad é DNS (Córas Ainmneacha Fearainn)?',
              explanation_en: 'The phonebook of the internet.',
              explanation_ga: 'Leabhar teileafóin an idirlín.'
            },
            {
              id: 'q-405',
              points: 500,
              clue_en: 'The secure encrypted version of HTTP that protects web traffic using TLS/SSL encryption.',
              clue_ga: 'An leagan slán criptithe de HTTP a chosnaíonn trácht gréasáin ag baint úsáide as criptiú TLS/SSL.',
              answer_en: 'What is HTTPS?',
              answer_ga: 'Cad é HTTPS?',
              explanation_en: 'HTTPS encrypts communications over port 443.',
              explanation_ga: 'Criptíonn HTTPS cumarsáid thar phort 443 le slándáil iomlán.'
            }
          ]
        },
        {
          id: 'cat-security',
          name_en: 'Cybersecurity',
          name_ga: 'Cibearshlándáil',
          questions: [
            {
              id: 'q-501',
              points: 100,
              clue_en: 'A security mechanism that requires two different forms of identification before logging in.',
              clue_ga: 'Meicníocht slándála a éilíonn dhá chineál aitheantais dhifriúla sula ndéantar logáil isteach.',
              answer_en: 'What is 2FA / MFA (Multi-Factor Authentication)?',
              answer_ga: 'Cad é 2FA / Fíordheimhniú Ilfhachtóra?',
              explanation_en: 'Combines something you know, something you have, or something you are.',
              explanation_ga: 'Comhcheanglaíonn sé rud atá ar eolas agat, rud atá agat, nó fachtóir bithmhéadrach.'
            },
            {
              id: 'q-502',
              points: 200,
              clue_en: 'A fraudulent attempt to obtain sensitive information like passwords by disguising as a trustworthy entity in email.',
              clue_ga: 'Iarracht calaoiseach ar fhaisnéis íogair ar nós pasfhocal a fháil trí ligean ort gur eagraíocht iontaofa thú i ríomhphost.',
              answer_en: 'What is Phishing?',
              answer_ga: 'Cad é Bradphadaireacht (Phishing)?',
              explanation_en: 'Social engineering attack exploiting human error.',
              explanation_ga: 'Ionsaí innealtóireachta sóisialta a bhaineann leas as botúin daonna.'
            },
            {
              id: 'q-503',
              points: 300,
              clue_en: 'A network security system that monitors and filters incoming and outgoing traffic based on predetermined rules.',
              clue_ga: 'Córas slándála líonra a dhéanann monatóireacht agus scagadh ar thrácht isteach agus amach bunaithe ar rialacha réamhshocraithe.',
              answer_en: 'What is a Firewall?',
              answer_ga: 'Cad é Balla Dóiteáin (Firewall)?',
              explanation_en: 'Acts as a protective barrier between trusted and untrusted networks.',
              explanation_ga: 'Gníomhaíonn sé mar bhac cosanta idir líonra iontaofa agus an t-idirlíon oscailte.'
            },
            {
              id: 'q-504',
              points: 400,
              clue_en: 'Type of malicious software that encrypts a victim\'s files and demands payment to restore access.',
              clue_ga: 'Cineál bogearraí mailíseacha a chriptíonn comhaid íospartaigh agus a éilíonn airgead chun rochtain a athbhunú.',
              answer_en: 'What is Ransomware?',
              answer_ga: 'Cad é Éiric-Earraí (Ransomware)?',
              explanation_en: 'Examples include WannaCry and LockBit.',
              explanation_ga: 'Samplaí clúiteacha ná WannaCry agus LockBit.'
            },
            {
              id: 'q-505',
              points: 500,
              clue_en: 'This European Union data privacy regulation grants citizens rights regarding their personal digital data.',
              clue_ga: 'Tugann an rialachán príobháideachta sonraí de chuid an Aontais Eorpaigh seo cearta do shaoránaigh maidir lena sonraí pearsanta.',
              answer_en: 'What is GDPR (General Data Protection Regulation)?',
              answer_ga: 'Cad é RGCS (Rialachán Ginearálta maidir le Cosaint Sonraí / GDPR)?',
              explanation_en: 'Enforced in Ireland by the Data Protection Commission (DPC).',
              explanation_ga: 'Feidhmithe in Éirinn ag an gCoimisiún um Chosaint Sonraí (DPC).'
            }
          ]
        }
      ]
    },
    {
      id: 'round-2',
      roundNumber: 2,
      name_en: 'Double Jeopardy',
      name_ga: 'Babhta 2: Jeopardy Dúbailte',
      categories: [
        {
          id: 'cat-algorithms',
          name_en: 'Algorithms & Logic',
          name_ga: 'Algartaim & Loighic',
          questions: [
            {
              id: 'q-2-101',
              points: 200,
              clue_en: 'A step-by-step set of precise instructions used to solve a specific problem or perform a task.',
              clue_ga: 'Sraith treoracha beachta céim ar chéim a úsáidtear chun fadhb ar leith a réiteach nó tasc a chur i gcrích.',
              answer_en: 'What is an Algorithm?',
              answer_ga: 'Cad é Algartam?',
              explanation_en: 'The core conceptual foundation of all software programming.',
              explanation_ga: 'Bunús coincheapúil gach cláir ríomhaireachta.'
            },
            {
              id: 'q-2-102',
              points: 400,
              clue_en: 'This efficient search algorithm repeatedly divides a sorted list in half to locate a target item.',
              clue_ga: 'Roinneann an t-algartam cuardaigh éifeachtach seo liosta curtha in eagar ina dhá leath arís agus arís eile chun sprioc-earra a aimsiú.',
              answer_en: 'What is Binary Search?',
              answer_ga: 'Cad é Cuardach Dénártha (Binary Search)?',
              explanation_en: 'Operates with logarithmic time complexity O(log n).',
              explanation_ga: 'Oibríonn sé le castacht ama logartamach O(log n).'
            },
            {
              id: 'q-2-103',
              points: 600,
              clue_en: 'A programming technique where a function calls itself directly or indirectly to solve smaller instances of a problem.',
              clue_ga: 'Teicníc ríomhchlárúcháin ina nglaonn feidhm uirthi féin chun cásanna níos lú d\'fhadhb a réiteach.',
              answer_en: 'What is Recursion?',
              answer_ga: 'Cad é Athfhillteacht (Recursion)?',
              explanation_en: 'Requires a base case to terminate execution.',
              explanation_ga: 'Éilíonn sé bonncás chun teacht chun críche.'
            },
            {
              id: 'q-2-104',
              points: 800,
              clue_en: 'Mathematical notation used in computer science to classify algorithms according to their running time or space requirements.',
              clue_ga: 'Nodaireacht mhatamaiticiúil a úsáidtear san eolaíocht ríomhaireachta chun algartaim a rangú de réir a n-ama rite nó a gcuid spáis.',
              answer_en: 'What is Big O Notation?',
              answer_ga: 'Cad é Nodaireacht Big O?',
              explanation_en: 'Expresses the upper bound of algorithm complexity.',
              explanation_ga: 'Léiríonn sé an uasteorainn de chastacht algartaim.'
            },
            {
              id: 'q-2-105',
              points: 1000,
              clue_en: 'This sorting algorithm divides an array into halves, sorts them recursively, and combines them back together.',
              clue_ga: 'Roinneann an t-algartam sórtála seo eagar ina dhá leath, sórtálann sé iad go hathfhillteach, agus comhcheanglaíonn sé ar ais le chéile iad.',
              answer_en: 'What is Merge Sort?',
              answer_ga: 'Cad é Sórtáil Chumaisc (Merge Sort)?',
              explanation_en: 'Guaranteed O(n log n) sorting efficiency.',
              explanation_ga: 'Éifeachtacht O(n log n) ráthaithe.'
            }
          ]
        },
        {
          id: 'cat-database',
          name_en: 'Databases & SQL',
          name_ga: 'Bunachair Shonraí & SQL',
          questions: [
            {
              id: 'q-2-201',
              points: 200,
              clue_en: 'The standard declarative language used to manage and query relational databases.',
              clue_ga: 'An teanga dhearbhaithe chaighdeánach a úsáidtear chun bunachair shonraí choibhneasta a bhainistiú agus a cheistiú.',
              answer_en: 'What is SQL (Structured Query Language)?',
              answer_ga: 'Cad é SQL (Teanga Cheisteanna Struchtúrtha)?',
              explanation_en: 'Pronounced "sequel" or S-Q-L.',
              explanation_ga: 'Úsáidtear go forleathan i gcórais bhunachair shonraí.'
            },
            {
              id: 'q-2-202',
              points: 400,
              clue_en: 'A column or set of columns in a table that uniquely identifies each row.',
              clue_ga: 'Colún nó sraith colún i dtábla a aithníonn gach sraith go huathúil.',
              answer_en: 'What is a Primary Key?',
              answer_ga: 'Cad é Príomh-Eochair (Primary Key)?',
              explanation_en: 'Must contain unique values and cannot contain NULL.',
              explanation_ga: 'Ní foláir luachanna uathúla a bheith ann agus ní féidir leis a bheith folamh.'
            },
            {
              id: 'q-2-203',
              points: 600,
              clue_en: 'The SQL clause used to filter rows returned by a SELECT query.',
              clue_ga: 'An clásal SQL a úsáidtear chun sraitheanna a scagadh a fhaightear ar ais ó cheist SELECT.',
              answer_en: 'What is WHERE?',
              answer_ga: 'Cad é WHERE?',
              explanation_en: 'Filters records based on conditional logic.',
              explanation_ga: 'Scagann sé taifid bunaithe ar choinníollacha loighciúla.'
            },
            {
              id: 'q-2-204',
              points: 800,
              clue_en: 'The process of organizing data in a database to reduce data redundancy and improve data integrity.',
              clue_ga: 'An próiseas chun sonraí a eagrú i mbunachar sonraí chun iomarcaíocht sonraí a laghdú agus sláine sonraí a fheabhsú.',
              answer_en: 'What is Normalization?',
              answer_ga: 'Cad é Normalú (Normalization)?',
              explanation_en: 'Follows normal forms (1NF, 2NF, 3NF).',
              explanation_ga: 'Leanann sé foirmeacha normalacha (1NF, 2NF, 3NF).'
            },
            {
              id: 'q-2-205',
              points: 1000,
              clue_en: 'ACID acronym in database transactions: Atomicity, Consistency, Isolation, and this final property.',
              clue_ga: 'Acrainm ACID in idirbhearta bunachair sonraí: Adamhacht, Comhsheasmhacht, Leithlisiú, agus an tréith deiridh seo.',
              answer_en: 'What is Durability?',
              answer_ga: 'Cad é Marthanacht (Durability)?',
              explanation_en: 'Guarantees that committed transactions will survive system crashes.',
              explanation_ga: 'Ráthaíonn sé go mairfidh sonraí tiomanta fiú má chliseann ar an gcóras.'
            }
          ]
        }
      ]
    },
    {
      id: 'round-3',
      roundNumber: 3,
      name_en: 'Final Jeopardy',
      name_ga: 'Babhta 3: Cluiche Ceannais (Final Jeopardy)',
      categories: [
        {
          id: 'cat-final',
          name_en: 'Future Technologies',
          name_ga: 'Teicneolaíochtaí na Todhchaí',
          questions: [
            {
              id: 'q-3-101',
              points: 5000,
              clue_en: 'This British mathematician and logician proposed the seminal test in 1950 to evaluate if a machine can exhibit human-equivalent intelligence.',
              clue_ga: 'Mhol an matamaiticeoir agus loighceoir Briotanach seo an tástáil cháiliúil i 1950 chun meastóireacht a dhéanamh an féidir le meaisín faisnéis atá comhionann le duine a léiriú.',
              answer_en: 'Who is Alan Turing?',
              answer_ga: 'Cé hé Alan Turing?',
              explanation_en: 'The Turing Test remains a cultural and scientific benchmark in AI philosophy.',
              explanation_ga: 'Fanann Tástáil Turing mar shlat tomhais eolaíoch san intleacht shaorga.'
            }
          ]
        }
      ]
    }
  ]
};
