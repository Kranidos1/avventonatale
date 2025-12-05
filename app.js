const state = {
	day: null,
	data: null,
	wordAnswer: '',
	placeAnswer: '',
	letters: [],
	slotToTileId: new Map(), // slotId -> tileId
	tileToSlotId: new Map(), // tileId -> slotId
	// Second puzzle maps
	slotToTileId2: new Map(),
	tileToSlotId2: new Map(),
};

const els = {
	dateLabel: document.getElementById('dateLabel'),
	dayNumber: document.getElementById('dayNumber'),
	dayOverride: document.getElementById('dayOverride'),
	goToDayBtn: document.getElementById('goToDayBtn'),
	riddleWordText: document.getElementById('riddleWordText'),
	answerSlots: document.getElementById('answerSlots'),
	letterBank: document.getElementById('letterBank'),
	checkAnswerBtn: document.getElementById('checkAnswerBtn'),
	resetBtn: document.getElementById('resetBtn'),
	feedback: document.getElementById('feedback'),
	secondRiddleSection: document.getElementById('secondRiddleSection'),
	riddlePlaceText: document.getElementById('riddlePlaceText'),
	answerSlots2: document.getElementById('answerSlots2'),
	letterBank2: document.getElementById('letterBank2'),
	checkPlaceBtn: document.getElementById('checkPlaceBtn'),
	resetPlaceBtn: document.getElementById('resetPlaceBtn'),
	placeFeedback: document.getElementById('placeFeedback'),
};

function getTodayDayOfAdvent() {
	const now = new Date();
	const isDecember = now.getMonth() === 11; // 0-indexed
	if (!isDecember) return null;
	const d = now.getDate();
	if (d < 1 || d > 24) return null;
	return d;
}

function getUrlOverride() {
	const params = new URLSearchParams(location.search);
	const dayStr = params.get('day');
	if (!dayStr) return null;
	const n = parseInt(dayStr, 10);
	return Number.isFinite(n) && n >= 1 && n <= 24 ? n : null;
}

async function loadData() {
	try {
		const res = await fetch('./data/advent.json', { cache: 'no-store' });
		if (!res.ok) throw new Error('HTTP ' + res.status);
		return await res.json();
	} catch (e) {
		// Fallback for local file:// testing or if JSON missing
		return {
			"1": {
				"indovinelloParola": "Sono piccolo e tondo, mi vedi sullo schermo. Se premi play ti porto lontano. Chi sono?",
				"rispostaParola": "DVD",
				"indovinelloLuogo": "Dove riposano le storie prima di essere viste? È lì che il dono ti aspetta.",
				"rispostaLuogo": "LIBRERIA"
			}
		};
	}
}

function formatDateLabel(d) {
	return d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function setHeaderDay(day) {
	els.dayNumber.textContent = String(day);
	els.dateLabel.textContent = formatDateLabel(new Date());
	els.dayOverride.value = String(day);
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function clearNode(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function buildSlots(answer) {
	clearNode(els.answerSlots);
	state.slotToTileId.clear();
	state.tileToSlotId.clear();
	const letters = answer.split('');
	letters.forEach((_, idx) => {
		const slot = document.createElement('div');
		slot.className = 'slot';
		slot.dataset.slotId = 's' + idx;
		slot.setAttribute('aria-dropeffect', 'move');
		slot.addEventListener('dragover', (e) => e.preventDefault());
		slot.addEventListener('drop', onDropToSlotWord);
		els.answerSlots.appendChild(slot);
	});
}

function buildBank(letters) {
	clearNode(els.letterBank);
	letters.forEach((ch, idx) => {
		const tile = document.createElement('div');
		tile.className = 'tile';
		tile.textContent = ch;
		tile.draggable = true;
		tile.id = 'w-' + idx; // unique prefix for word puzzle
		tile.addEventListener('dragstart', onDragStart);
		tile.addEventListener('dragend', onDragEnd);
		els.letterBank.appendChild(tile);
	});
}

function onDragStart(ev) {
	ev.dataTransfer.setData('text/plain', ev.target.id);
	ev.target.classList.add('dragging');
}
function onDragEnd(ev) {
	ev.target.classList.remove('dragging');
}

function onDropToSlotWord(ev) {
	ev.preventDefault();
	const tileId = ev.dataTransfer.getData('text/plain');
	const tile = document.getElementById(tileId);
	if (!tile) return;
	const slot = ev.currentTarget;

	// If tile already placed somewhere, free previous slot
	const currentSlotId = state.tileToSlotId.get(tileId);
	if (currentSlotId) {
		state.slotToTileId.delete(currentSlotId);
		const oldSlot = [...els.answerSlots.children].find(el => el.dataset.slotId === currentSlotId);
		if (oldSlot) oldSlot.classList.remove('filled');
	}

	// If slot already has tile, move it back to bank
	const slotId = slot.dataset.slotId;
	const occupiedTileId = state.slotToTileId.get(slotId);
	if (occupiedTileId) {
		const occupiedTile = document.getElementById(occupiedTileId);
		if (occupiedTile) els.letterBank.appendChild(occupiedTile);
		state.tileToSlotId.delete(occupiedTileId);
	}

	slot.classList.add('filled');
	state.slotToTileId.set(slotId, tileId);
	state.tileToSlotId.set(tileId, slotId);
	slot.appendChild(tile);
}

function resetDnd() {
	// Move all tiles back to bank
	[...els.answerSlots.children].forEach(slot => {
		slot.classList.remove('filled');
		const tile = slot.querySelector('.tile');
		if (tile) els.letterBank.appendChild(tile);
	});
	state.slotToTileId.clear();
	state.tileToSlotId.clear();
	els.feedback.textContent = '';
	els.feedback.className = 'feedback';
}

function getConstructedAnswer() {
	const slots = [...els.answerSlots.children];
	return slots.map(slot => {
		const tile = slot.querySelector('.tile');
		return tile ? tile.textContent : '';
	}).join('');
}

// --- Second puzzle (place) DnD helpers ---
function buildSlots2(answer) {
	clearNode(els.answerSlots2);
	state.slotToTileId2.clear();
	state.tileToSlotId2.clear();
	const letters = answer.split('');
	letters.forEach((_, idx) => {
		const slot = document.createElement('div');
		slot.className = 'slot';
		slot.dataset.slotId = 'p' + idx;
		slot.setAttribute('aria-dropeffect', 'move');
		slot.addEventListener('dragover', (e) => e.preventDefault());
		slot.addEventListener('drop', onDropToSlotPlace);
		els.answerSlots2.appendChild(slot);
	});
}

function buildBank2(letters) {
	clearNode(els.letterBank2);
	letters.forEach((ch, idx) => {
		const tile = document.createElement('div');
		tile.className = 'tile';
		tile.textContent = ch;
		tile.draggable = true;
		tile.id = 'p-' + idx; // unique prefix for place puzzle
		tile.addEventListener('dragstart', onDragStart);
		tile.addEventListener('dragend', onDragEnd);
		els.letterBank2.appendChild(tile);
	});
}

function onDropToSlotPlace(ev) {
	ev.preventDefault();
	const tileId = ev.dataTransfer.getData('text/plain');
	const tile = document.getElementById(tileId);
	if (!tile) return;
	const slot = ev.currentTarget;

	// If tile already placed somewhere, free previous slot
	const currentSlotId = state.tileToSlotId2.get(tileId);
	if (currentSlotId) {
		state.slotToTileId2.delete(currentSlotId);
		const oldSlot = [...els.answerSlots2.children].find(el => el.dataset.slotId === currentSlotId);
		if (oldSlot) oldSlot.classList.remove('filled');
	}

	// If slot already has tile, move it back to bank
	const slotId = slot.dataset.slotId;
	const occupiedTileId = state.slotToTileId2.get(slotId);
	if (occupiedTileId) {
		const occupiedTile = document.getElementById(occupiedTileId);
		if (occupiedTile) els.letterBank2.appendChild(occupiedTile);
		state.tileToSlotId2.delete(occupiedTileId);
	}

	slot.classList.add('filled');
	state.slotToTileId2.set(slotId, tileId);
	state.tileToSlotId2.set(tileId, slotId);
	slot.appendChild(tile);
}

function resetDnd2() {
	[...els.answerSlots2.children].forEach(slot => {
		slot.classList.remove('filled');
		const tile = slot.querySelector('.tile');
		if (tile) els.letterBank2.appendChild(tile);
	});
	state.slotToTileId2.clear();
	state.tileToSlotId2.clear();
	els.placeFeedback.textContent = '';
	els.placeFeedback.className = 'feedback';
}

function getConstructedAnswer2() {
	const slots = [...els.answerSlots2.children];
	return slots.map(slot => {
		const tile = slot.querySelector('.tile');
		return tile ? tile.textContent : '';
	}).join('');
}

function normalize(s) {
	return (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function checkFirstRiddle() {
	const attempt = normalize(getConstructedAnswer());
	const correct = normalize(state.wordAnswer);
	if (attempt.length !== correct.length) {
		els.feedback.textContent = 'Completa tutte le lettere 😊';
		els.feedback.className = 'feedback err';
		return false;
	}
	const ok = attempt === correct;
	els.feedback.textContent = ok ? 'Bravo! 🎉 Passa al secondo indovinello.' : 'Quasi… riprova!';
	els.feedback.className = 'feedback ' + (ok ? 'ok' : 'err');
	return ok;
}

function revealSecondRiddle() {
	els.secondRiddleSection.classList.remove('hidden');
	els.placeFeedback.textContent = '';
	els.placeFeedback.className = 'feedback';
	// Build second DnD
	buildSlots2(state.placeAnswer);
	const letters2 = shuffle(state.placeAnswer.split(''));
	buildBank2(letters2);
	resetDnd2();
}

function checkPlace() {
	const attempt = normalize(getConstructedAnswer2());
	const correct = normalize(state.placeAnswer);
	if (attempt.length !== correct.length) {
		els.placeFeedback.textContent = 'Completa tutte le lettere 😊';
		els.placeFeedback.className = 'feedback err';
		return false;
	}
	const ok = attempt === correct;
	els.placeFeedback.textContent = ok ? 'Trovato! 🗺️ Vai a cercare lì!' : 'Mmm, non credo sia quello. Riprova!';
	els.placeFeedback.className = 'feedback ' + (ok ? 'ok' : 'err');
	return ok;
}

function hydrateDay(day) {
	const record = state.data?.[String(day)];
	if (!record) {
		els.riddleWordText.textContent = 'Nessun indovinello disponibile per questo giorno.';
		return;
	}
	const r1 = record.indovinelloParola || 'Indovinello non disponibile';
	const a1 = (record.rispostaParola || '').toString().toUpperCase();
	const r2 = record.indovinelloLuogo || 'Indovinello luogo non disponibile';
	const a2 = (record.rispostaLuogo || '').toString().toUpperCase();

	state.wordAnswer = a1;
	state.placeAnswer = a2;

	els.riddleWordText.textContent = r1;
	els.riddlePlaceText.textContent = r2;

	// Build DnD game
	buildSlots(a1);
	const letters = shuffle(a1.split(''));
	state.letters = letters;
	buildBank(letters);
	resetDnd();
	els.secondRiddleSection.classList.add('hidden');
	// Clear second puzzle containers
	clearNode(els.answerSlots2);
	clearNode(els.letterBank2);
}

function goToDay(day) {
	state.day = day;
	setHeaderDay(day);
	hydrateDay(day);
	const params = new URLSearchParams(location.search);
	params.set('day', String(day));
	history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function wireEvents() {
	els.goToDayBtn.addEventListener('click', () => {
		const n = parseInt(els.dayOverride.value, 10);
		if (Number.isFinite(n) && n >= 1 && n <= 24) goToDay(n);
	});
	els.checkAnswerBtn.addEventListener('click', () => {
		if (checkFirstRiddle()) revealSecondRiddle();
	});
	els.resetBtn.addEventListener('click', resetDnd);
	els.checkPlaceBtn.addEventListener('click', checkPlace);
	els.resetPlaceBtn.addEventListener('click', resetDnd2);
}

async function init() {
	wireEvents();
	state.data = await loadData();
	const override = getUrlOverride();
	const today = getTodayDayOfAdvent();
	const initial = override ?? today ?? 1;
	goToDay(initial);
}

init();


