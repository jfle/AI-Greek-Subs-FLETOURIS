'use strict';

// ISO 639-2/B codes used by Stremio, plus common OpenSubtitles regional codes.
// Source: https://www.loc.gov/standards/iso639-2/php/code_list-utf8.php
const rows = `aar||aa|Afar
abk||ab|Abkhazian
ace|||Achinese
ach|||Acoli
ada|||Adangme
ady|||Adyghe
afa|||Afro-Asiatic languages
afh|||Afrihili
afr||af|Afrikaans
ain|||Ainu
aka||ak|Akan
akk|||Akkadian
alb|sqi|sq|Albanian
ale|||Aleut
alg|||Algonquian languages
alt|||Southern Altai
amh||am|Amharic
ang|||English, Old (ca.450-1100)
anp|||Angika
apa|||Apache languages
ara||ar|Arabic
arc|||Official Aramaic (700-300 BCE)
arg||an|Aragonese
arm|hye|hy|Armenian
arn|||Mapudungun
arp|||Arapaho
art|||Artificial languages
arw|||Arawak
asm||as|Assamese
ast|||Asturian
ath|||Athapascan languages
aus|||Australian languages
ava||av|Avaric
ave||ae|Avestan
awa|||Awadhi
aym||ay|Aymara
aze||az|Azerbaijani
bad|||Banda languages
bai|||Bamileke languages
bak||ba|Bashkir
bal|||Baluchi
bam||bm|Bambara
ban|||Balinese
baq|eus|eu|Basque
bas|||Basa
bat|||Baltic languages
bej|||Beja
bel||be|Belarusian
bem|||Bemba
ben||bn|Bengali
ber|||Berber languages
bho|||Bhojpuri
bih|||Bihari languages
bik|||Bikol
bin|||Bini
bis||bi|Bislama
bla|||Siksika
bnt|||Bantu languages
bos||bs|Bosnian
bra|||Braj
bre||br|Breton
btk|||Batak languages
bua|||Buriat
bug|||Buginese
bul||bg|Bulgarian
bur|mya|my|Burmese
byn|||Blin
cad|||Caddo
cai|||Central American Indian languages
car|||Galibi Carib
cat||ca|Catalan
cau|||Caucasian languages
ceb|||Cebuano
cel|||Celtic languages
cha||ch|Chamorro
chb|||Chibcha
che||ce|Chechen
chg|||Chagatai
chi|zho|zh|Chinese
chk|||Chuukese
chm|||Mari
chn|||Chinook jargon
cho|||Choctaw
chp|||Chipewyan
chr|||Cherokee
chu||cu|Church Slavic
chv||cv|Chuvash
chy|||Cheyenne
cmc|||Chamic languages
cnr|||Montenegrin
cop|||Coptic
cor||kw|Cornish
cos||co|Corsican
cpe|||Creoles and pidgins, English based
cpf|||Creoles and pidgins, French-based
cpp|||Creoles and pidgins, Portuguese-based
cre||cr|Cree
crh|||Crimean Tatar
crp|||Creoles and pidgins
csb|||Kashubian
cus|||Cushitic languages
cze|ces|cs|Czech
dak|||Dakota
dan||da|Danish
dar|||Dargwa
day|||Land Dayak languages
del|||Delaware
den|||Slave (Athapascan)
dgr|||Tlicho
din|||Dinka
div||dv|Divehi
doi|||Dogri
dra|||Dravidian languages
dsb|||Lower Sorbian
dua|||Duala
dum|||Dutch, Middle (ca.1050-1350)
dut|nld|nl|Dutch
dyu|||Dyula
dzo||dz|Dzongkha
efi|||Efik
egy|||Egyptian (Ancient)
eka|||Ekajuk
elx|||Elamite
eng||en|English
enm|||English, Middle (1100-1500)
epo||eo|Esperanto
est||et|Estonian
ewe||ee|Ewe
ewo|||Ewondo
fan|||Fang
fao||fo|Faroese
fat|||Fanti
fij||fj|Fijian
fil|||Filipino
fin||fi|Finnish
fiu|||Finno-Ugrian languages
fon|||Fon
fre|fra|fr|French
frm|||French, Middle (ca.1400-1600)
fro|||French, Old (842-ca.1400)
frr|||Northern Frisian
frs|||Eastern Frisian
fry||fy|Western Frisian
ful||ff|Fulah
fur|||Friulian
gaa|||Ga
gay|||Gayo
gba|||Gbaya
gem|||Germanic languages
geo|kat|ka|Georgian
ger|deu|de|German
gez|||Geez
gil|||Gilbertese
gla||gd|Gaelic
gle||ga|Irish
glg||gl|Galician
glv||gv|Manx
gmh|||German, Middle High (ca.1050-1500)
goh|||German, Old High (ca.750-1050)
gon|||Gondi
gor|||Gorontalo
got|||Gothic
grb|||Grebo
grc|||Greek, Ancient (to 1453)
ell|gre|el|Greek
grn||gn|Guarani
gsw|||Swiss German
guj||gu|Gujarati
gwi|||Gwich'in
hai|||Haida
hat||ht|Haitian
hau||ha|Hausa
haw|||Hawaiian
heb||he|Hebrew
her||hz|Herero
hil|||Hiligaynon
him|||Himachali languages
hin||hi|Hindi
hit|||Hittite
hmn|||Hmong
hmo||ho|Hiri Motu
hrv||hr|Croatian
hsb|||Upper Sorbian
hun||hu|Hungarian
hup|||Hupa
iba|||Iban
ibo||ig|Igbo
ice|isl|is|Icelandic
ido||io|Ido
iii||ii|Sichuan Yi
ijo|||Ijo languages
iku||iu|Inuktitut
ile||ie|Interlingue
ilo|||Iloko
ina||ia|Interlingua (International Auxiliary Language Association)
inc|||Indic languages
ind||id|Indonesian
ine|||Indo-European languages
inh|||Ingush
ipk||ik|Inupiaq
ira|||Iranian languages
iro|||Iroquoian languages
ita||it|Italian
jav||jv|Javanese
jbo|||Lojban
jpn||ja|Japanese
jpr|||Judeo-Persian
jrb|||Judeo-Arabic
kaa|||Kara-Kalpak
kab|||Kabyle
kac|||Kachin
kal||kl|Kalaallisut
kam|||Kamba
kan||kn|Kannada
kar|||Karen languages
kas||ks|Kashmiri
kau||kr|Kanuri
kaw|||Kawi
kaz||kk|Kazakh
kbd|||Kabardian
kha|||Khasi
khi|||Khoisan languages
khm||km|Central Khmer
kho|||Khotanese
kik||ki|Kikuyu
kin||rw|Kinyarwanda
kir||ky|Kirghiz
kmb|||Kimbundu
kok|||Konkani
kom||kv|Komi
kon||kg|Kongo
kor||ko|Korean
kos|||Kosraean
kpe|||Kpelle
krc|||Karachay-Balkar
krl|||Karelian
kro|||Kru languages
kru|||Kurukh
kua||kj|Kuanyama
kum|||Kumyk
kur||ku|Kurdish
kut|||Kutenai
lad|||Ladino
lah|||Lahnda
lam|||Lamba
lao||lo|Lao
lat||la|Latin
lav||lv|Latvian
lez|||Lezghian
lim||li|Limburgan
lin||ln|Lingala
lit||lt|Lithuanian
lol|||Mongo
loz|||Lozi
ltz||lb|Luxembourgish
lua|||Luba-Lulua
lub||lu|Luba-Katanga
lug||lg|Ganda
lui|||Luiseno
lun|||Lunda
luo|||Luo (Kenya and Tanzania)
lus|||Lushai
mac|mkd|mk|Macedonian
mad|||Madurese
mag|||Magahi
mah||mh|Marshallese
mai|||Maithili
mak|||Makasar
mal||ml|Malayalam
man|||Mandingo
mao|mri|mi|Maori
map|||Austronesian languages
mar||mr|Marathi
mas|||Masai
may|msa|ms|Malay
mdf|||Moksha
mdr|||Mandar
men|||Mende
mga|||Irish, Middle (900-1200)
mic|||Mi'kmaq
min|||Minangkabau
mkh|||Mon-Khmer languages
mlg||mg|Malagasy
mlt||mt|Maltese
mnc|||Manchu
mni|||Manipuri
mno|||Manobo languages
moh|||Mohawk
mon||mn|Mongolian
mos|||Mossi
mun|||Munda languages
mus|||Creek
mwl|||Mirandese
mwr|||Marwari
myn|||Mayan languages
myv|||Erzya
nah|||Nahuatl languages
nai|||North American Indian languages
nap|||Neapolitan
nau||na|Nauru
nav||nv|Navajo
nbl||nr|South Ndebele
nde||nd|North Ndebele
ndo||ng|Ndonga
nds|||Low German
nep||ne|Nepali
new|||Nepal Bhasa
nia|||Nias
nic|||Niger-Kordofanian languages
niu|||Niuean
nno||nn|Norwegian Nynorsk
nob||nb|Norwegian Bokmål
nog|||Nogai
non|||Norse, Old
nor||no|Norwegian
nqo|||N'Ko
nso|||Pedi
nub|||Nubian languages
nwc|||Classical Newari
nya||ny|Chichewa
nym|||Nyamwezi
nyn|||Nyankole
nyo|||Nyoro
nzi|||Nzima
oci||oc|Occitan (post 1500)
oji||oj|Ojibwa
ori||or|Oriya
orm||om|Oromo
osa|||Osage
oss||os|Ossetian
ota|||Turkish, Ottoman (1500-1928)
oto|||Otomian languages
paa|||Papuan languages
pag|||Pangasinan
pal|||Pahlavi
pam|||Pampanga
pan||pa|Panjabi
pap|||Papiamento
pau|||Palauan
peo|||Persian, Old (ca.600-400 B.C.)
per|fas|fa|Persian
phi|||Philippine languages
phn|||Phoenician
pli||pi|Pali
pol||pl|Polish
pon|||Pohnpeian
por||pt|Portuguese
pra|||Prakrit languages
pro|||Provençal, Old (to 1500)
pus||ps|Pushto
que||qu|Quechua
raj|||Rajasthani
rap|||Rapanui
rar|||Rarotongan
roa|||Romance languages
roh||rm|Romansh
rom|||Romany
rum|ron|ro|Romanian
run||rn|Rundi
rup|||Aromanian
rus||ru|Russian
sad|||Sandawe
sag||sg|Sango
sah|||Yakut
sai|||South American Indian languages
sal|||Salishan languages
sam|||Samaritan Aramaic
san||sa|Sanskrit
sas|||Sasak
sat|||Santali
scn|||Sicilian
sco|||Scots
sel|||Selkup
sem|||Semitic languages
sga|||Irish, Old (to 900)
sgn|||Sign Languages
shn|||Shan
sid|||Sidamo
sin||si|Sinhala
sio|||Siouan languages
sit|||Sino-Tibetan languages
sla|||Slavic languages
slo|slk|sk|Slovak
slv||sl|Slovenian
sma|||Southern Sami
sme||se|Northern Sami
smi|||Sami languages
smj|||Lule Sami
smn|||Inari Sami
smo||sm|Samoan
sms|||Skolt Sami
sna||sn|Shona
snd||sd|Sindhi
snk|||Soninke
sog|||Sogdian
som||so|Somali
son|||Songhai languages
sot||st|Sotho, Southern
spa||es|Spanish
srd||sc|Sardinian
srn|||Sranan Tongo
srp||sr|Serbian
srr|||Serer
ssa|||Nilo-Saharan languages
ssw||ss|Swati
suk|||Sukuma
sun||su|Sundanese
sus|||Susu
sux|||Sumerian
swa||sw|Swahili
swe||sv|Swedish
syc|||Classical Syriac
syr|||Syriac
tah||ty|Tahitian
tai|||Tai languages
tam||ta|Tamil
tat||tt|Tatar
tel||te|Telugu
tem|||Timne
ter|||Tereno
tet|||Tetum
tgk||tg|Tajik
tgl||tl|Tagalog
tha||th|Thai
tib|bod|bo|Tibetan
tig|||Tigre
tir||ti|Tigrinya
tiv|||Tiv
tkl|||Tokelau
tlh|||Klingon
tli|||Tlingit
tmh|||Tamashek
tog|||Tonga (Nyasa)
ton||to|Tonga (Tonga Islands)
tpi|||Tok Pisin
tsi|||Tsimshian
tsn||tn|Tswana
tso||ts|Tsonga
tuk||tk|Turkmen
tum|||Tumbuka
tup|||Tupi languages
tur||tr|Turkish
tut|||Altaic languages
tvl|||Tuvalu
twi||tw|Twi
tyv|||Tuvinian
udm|||Udmurt
uga|||Ugaritic
uig||ug|Uighur
ukr||uk|Ukrainian
umb|||Umbundu
urd||ur|Urdu
uzb||uz|Uzbek
vai|||Vai
ven||ve|Venda
vie||vi|Vietnamese
vol||vo|Volapük
vot|||Votic
wak|||Wakashan languages
wal|||Wolaitta
war|||Waray
was|||Washo
wel|cym|cy|Welsh
wen|||Sorbian languages
wln||wa|Walloon
wol||wo|Wolof
xal|||Kalmyk
xho||xh|Xhosa
yao|||Yao
yap|||Yapese
yid||yi|Yiddish
yor||yo|Yoruba
ypk|||Yupik languages
zap|||Zapotec
zbl|||Blissymbols
zen|||Zenaga
zgh|||Standard Moroccan Tamazight
zha||za|Zhuang
znd|||Zande languages
zul||zu|Zulu
zun|||Zuni
zza|||Zaza
pob||pt-br|Portuguese (Brazil)
spl||es-419|Spanish (Latin America)
zht||zh-tw|Chinese (Traditional)
zhs||zh-cn|Chinese (Simplified)`.split('\n').map((row) => row.split('|'));
const LANGUAGES = Object.fromEntries(rows
  .sort((a, b) => a[3].localeCompare(b[3], 'en'))
  .map(([code, , , name]) => [code, name]));
const aliases = new Map();
for (const [code, terminologic, locale, name] of rows) {
  for (const key of [code, terminologic, locale, name.toLowerCase()].filter(Boolean)) {
    aliases.set(key, code);
  }
}
for (const [key, code] of Object.entries({
  scc: 'srp', scr: 'hrv', 'ελληνικά': 'ell', 'zh-hant': 'zht', 'zh-hans': 'zhs',
})) aliases.set(key, code);

function languageCode(value) {
  const code = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  return aliases.get(code) || aliases.get(code.split('-')[0]);
}

function matchesLanguage(value, target) {
  const code = languageCode(value);
  return code === target || (target === 'por' && code === 'pob')
    || (target === 'spa' && code === 'spl') || (target === 'chi' && ['zht', 'zhs'].includes(code));
}

module.exports = { LANGUAGES, languageCode, matchesLanguage };
