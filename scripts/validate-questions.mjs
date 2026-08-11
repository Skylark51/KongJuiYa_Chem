import { QUESTIONS, QUESTION_BANKS } from '../data/questions.js';
import { TRAINING_MODES } from '../data/training-modes.js';
import { ATOMIC_MASSES, ATOMIC_NUMBERS, ELEMENTS_1_TO_20, ELECTRONEGATIVITY, GROUPS, PERIODS, VALENCE_ELECTRONS } from '../data/chemistry-constants.js';

const errors=[];
const warnings=[];
const modes=new Map(TRAINING_MODES.map(mode=>[mode.id,mode]));
const allowedElements=new Set(ELEMENTS_1_TO_20);
const redoxExtendedElements=new Set(['Cr','Mn','Fe','Co','Ni','Cu','Zn','Br','Ag','I','Ba','Pb']);
const metalReactivityElements=new Set(['K','Ca','Na','Mg','Al','Zn','Fe','Ni','Sn','Pb','H','Cu','Hg','Ag','Pt','Au']);
const forbiddenPhrases=['교육과정상','교육과정에 따르면','교육과정 기준','교과 과정상'];
const outOfRangeSymbols=['Sc','Ti','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn'];
const forbiddenElementPattern=new RegExp('(?<![A-Za-z])(?:'+outOfRangeSymbols.join('|')+')(?![a-z])','g');
const numericTypes=new Set(['numeric']);
const quantityModes=new Set(['mole_mass','gas_molar_volume','concentration']);
const fail=(code,item,detail='')=>errors.push(code+':'+(item?.id||'unknown')+(detail?':'+detail:''));
const warn=(code,item,detail='')=>warnings.push(code+':'+(item?.id||'unknown')+(detail?':'+detail:''));
const textOf=item=>JSON.stringify([item.prompt,item.promptHtml,item.explanation,item.tags,item.choices,item.answers]);
const formulaMass=formula=>{let total=0;const tokens=String(formula).match(/[A-Z][a-z]?\d*/g)||[];if(tokens.join('')!==formula)return null;for(const token of tokens){const match=token.match(/^([A-Z][a-z]?)(\d*)$/);const symbol=match[1];const count=Number(match[2]||1);if(!allowedElements.has(symbol))return null;total+=ATOMIC_MASSES[symbol]*count}return total};
const formulaTags=item=>item.tags.filter(tag=>/^[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*$/.test(tag));

const ids=new Set();
const normalizedPrompts=new Map();
for(const item of QUESTIONS){
  if(!item?.id||ids.has(item.id))fail('duplicate_id',item);ids.add(item?.id);
  for(const field of ['trainingId','type','prompt','explanation'])if(!item?.[field])fail('missing_'+field,item);
  if(!modes.has(item.trainingId))fail('invalid_trainingId',item,item.trainingId);
  if(![1,2,3].includes(item.difficulty))fail('difficulty',item);
  if(!Array.isArray(item.answers)||item.answers.length===0||item.answers.some(answer=>String(answer).trim()===''))fail('empty_answer',item);
  if(!Array.isArray(item.tags)||item.tags.length===0)fail('missing_tags',item);
  if(!item.inputMode||!Array.isArray(item.allowedKeys)||typeof item.autoSubmit!=='boolean')fail('input_metadata',item);
  if(numericTypes.has(item.type)&&typeof item.tolerance!=='number')fail('missing_numeric_tolerance',item);
  if(['binary_choice','multiple_choice'].includes(item.type)){
    if(!Array.isArray(item.choices)||item.choices.length<2)fail('invalid_choices',item);if(item.type==='binary_choice'&&item.choices.some(choice=>!choice?.label))fail('invalid_binary_choices',item);
    if(item.type==='binary_choice'&&!item.choices.some(choice=>String(choice.key)===String(item.correctChoice)))fail('correct_choice_range',item);
    if(item.type==='multiple_choice'&&(!Number.isInteger(item.correctChoice)||item.correctChoice<0||item.correctChoice>=item.choices.length))fail('correct_choice_range',item);
  }
  const text=textOf(item);
  for(const phrase of forbiddenPhrases)if(text.includes(phrase))fail('forbidden_phrase',item,phrase);
  const outOfRangeMatches=[...text.matchAll(forbiddenElementPattern)].map(match=>match[0]);
  forbiddenElementPattern.lastIndex=0;
  const disallowedOutOfRange=item.trainingId==='redox'
    ?outOfRangeMatches.filter(symbol=>!redoxExtendedElements.has(symbol))
    :item.trainingId==='metal_reactivity'
      ?outOfRangeMatches.filter(symbol=>!metalReactivityElements.has(symbol))
      :outOfRangeMatches;
  if(disallowedOutOfRange.length)fail('element_out_of_range',item,[...new Set(disallowedOutOfRange)].join(','));
  const promptKey=String(item.prompt).replace(/(?<![A-Za-z])\d+(?:\.\d+)?(?![A-Za-z])/g,'#').replace(/\s+/g,' ').trim();
  const promptList=normalizedPrompts.get(promptKey)||[];promptList.push(item);normalizedPrompts.set(promptKey,promptList);
  if(item.type==='numeric'&&quantityModes.has(item.trainingId)&&item.calculationType!=='formula_result'&&!item.unit)fail('missing_unit',item);
  if(item.trainingId==='mole_mass'){
    for(const formula of formulaTags(item))if(formulaMass(formula)===null)fail('mole_mass_formula',item,formula);
  }
}
for(const [key,items] of normalizedPrompts)if(items.length>1)warn('numeric_or_wording_clone',items[0],items.map(item=>item.id).join(','));

for(const mode of TRAINING_MODES){
  if(!mode.title||!mode.shortDescription||!mode.description)errors.push('mode_metadata:'+mode.id);
  if(/훈련/.test(JSON.stringify(mode)))errors.push('visible_training_word:'+mode.id);
}

const checkFixed=(bankName,table)=>{for(const item of QUESTION_BANKS[bankName]||[]){const symbol=item.tags.find(tag=>allowedElements.has(tag));if(!symbol)fail('missing_element_tag',item);else if(Number(item.answers[0])!==table[symbol])fail('fixed_value',item,symbol)}};
if(QUESTION_BANKS.atomic_number?.length!==20)errors.push('atomic_number_count');
for(const item of QUESTION_BANKS.atomic_number||[]){const symbol=item.tags.find(tag=>allowedElements.has(tag));if(!symbol||Number(item.answers[0])!==ATOMIC_NUMBERS[symbol]||String(item.prompt)!==symbol)fail('atomic_number_rule',item)}
if(QUESTION_BANKS.atomic_mass?.length!==20)errors.push('atomic_mass_count');
checkFixed('atomic_mass',ATOMIC_MASSES);
checkFixed('valence_electron',VALENCE_ELECTRONS);
for(const item of QUESTION_BANKS.valence_electron||[])if(['He','Ne','Ar'].some(symbol=>item.tags.includes(symbol))&&item.answers[0]!=='0')fail('noble_gas_valence',item);
for(const item of QUESTION_BANKS.period_group||[]){const symbol=item.tags.find(tag=>allowedElements.has(tag));const group=item.tags.includes('족');const expected=group?GROUPS[symbol]:PERIODS[symbol];if(!symbol||Number(item.answers[0])!==expected||((item.prompt.includes('주기')&&item.prompt.includes('족'))))fail('period_group_rule',item)}
for(const item of QUESTION_BANKS.electronegativity||[]){if(item.id.startsWith('electronegativity_value_')){const symbol=item.tags.find(tag=>allowedElements.has(tag));if(!symbol||ELECTRONEGATIVITY[symbol]===undefined||Number(item.answers[0])!==ELECTRONEGATIVITY[symbol]||typeof item.tolerance!=='number')fail('electronegativity_fixed_value',item);if(['He','Ne','Ar'].includes(symbol))fail('noble_gas_electronegativity',item)}}
for(const item of QUESTION_BANKS.gas_molar_volume||[])if(/이상\s*기체|PV\s*=|이상 기체 방정식/.test(item.prompt+' '+item.explanation))fail('gas_banned_term',item);
if(QUESTION_BANKS.redox?.length!==52)errors.push('redox_count');
for(const item of QUESTION_BANKS.redox||[]){
  const labels=(item.choices||[]).map(choice=>choice.label);
  if(item.type!=='multiple_choice'||item.choices.length!==3||!item.autoSubmit||item.inputMode!=='choice'||JSON.stringify(item.keyboardShortcuts)!==JSON.stringify(['1','2','3'])||JSON.stringify(labels)!==JSON.stringify(['산화','환원','둘 다 아님'])||!item.promptHtml?.includes('<u>'))fail('redox_not_three_choice',item);
}

const metalReactivityBank=QUESTION_BANKS.metal_reactivity||[];
if(metalReactivityBank.length!==240)errors.push('metal_reactivity_count');
const metalRanks=new Map([...metalReactivityElements].map((symbol,index)=>[symbol,index]));
for(const item of metalReactivityBank){
  const match=String(item.prompt).match(/^\(([A-Z][a-z]?) ([A-Z][a-z]?)\)$/);
  if(!match){fail('metal_reactivity_prompt',item);continue}
  const left=match[1],right=match[2];
  const labels=(item.choices||[]).map(choice=>choice.label);
  const values=(item.choices||[]).map(choice=>choice.value);
  if(left===right||!metalReactivityElements.has(left)||!metalReactivityElements.has(right))fail('metal_reactivity_symbols',item);
  if(JSON.stringify(labels)!==JSON.stringify(['좌','우'])||JSON.stringify(values)!==JSON.stringify([left,right])||item.choicePresentation!=='left_right')fail('metal_reactivity_choices',item);
  const expected=metalRanks.get(left)<metalRanks.get(right)?'1':'2';
  if(String(item.correctChoice)!==expected)fail('metal_reactivity_answer',item);
}

const counts=Object.fromEntries(Object.entries(QUESTION_BANKS).map(([name,items])=>[name,items.length]));
console.log('Question files: data/questions/*.js');
console.log('Total questions:',QUESTIONS.length);
console.log('Mode counts:',JSON.stringify(counts));
if(warnings.length)console.log('Warnings:',JSON.stringify(warnings,null,2));
if(errors.length){console.error('Validation errors:',JSON.stringify(errors,null,2));process.exitCode=1}else console.log('Validation passed: 0 errors');
