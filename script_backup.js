document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const matchesListSection = document.getElementById('matches-list');
    const loadingElement = document.getElementById('loading');
    const noResultsElement = document.getElementById('no-results');
    const countrySelectorBtn = document.getElementById('country-selector-btn');
    const countryModalOverlay = document.getElementById('country-modal-overlay');
    const countryModal = document.getElementById('country-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const countrySearchInput = document.getElementById('country-search-input');
    const countryList = document.getElementById('country-list');
    const confidenceSelectorBtn = document.getElementById('confidence-selector-btn');
    const confidenceModalOverlay = document.getElementById('confidence-modal-overlay');
    const confidenceModal = document.getElementById('confidence-modal');
    const closeConfidenceModalBtn = document.getElementById('close-confidence-modal-btn');
    const confidenceList = document.getElementById('confidence-list');
    const strategySelectorBtn = document.getElementById('strategy-selector-btn');
    const strategyModalOverlay = document.getElementById('strategy-modal-overlay');
    const strategyModal = document.getElementById('strategy-modal');
    const closeStrategyModalBtn = document.getElementById('close-strategy-modal-btn');
    const strategyList = document.getElementById('strategy-list');
    const sortTimeSelectorBtn = document.getElementById('sort-time-selector-btn');
    const sortTimeModalOverlay = document.getElementById('sort-time-modal-overlay');
    const sortTimeModal = document.getElementById('sort-time-modal');
    const closeSortTimeModalBtn = document.getElementById('close-sort-time-modal-btn');
    const sortTimeList = document.getElementById('sort-time-list');
    const teamSearch = document.getElementById('team-search');
    const totalMatchesElement = document.getElementById('total-matches');
    const lastUpdateElement = document.getElementById('last-update-time');
    const resetButton = document.querySelector('.reset-filters-btn');
    const hideStartedToggle = document.getElementById('hide-started-toggle');

    // --- State ---
    let allMatchesData = [];
    let currentFilters = {
        competition: '',
        confidence: '',
        strategy: '',
        sortTime: '',
        search: '',
        hideStarted: true
    };

    // --- Date Management ---
    let currentDate = new Date();
    
    const formatDateForFile = (date) => {
        // Use local timezone instead of UTC to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // YYYY-MM-DD format
    };

    // Available dates will be populated dynamically
    let availableDates = [];
    
    // Cache for date discovery to avoid duplicate requests
    let dateDiscoveryCache = new Map();
    let lastDiscoveryTime = 0;

    // Function to discover available dates - DYNAMIC VERSION with caching
    const discoverAvailableDates = async (forceRefresh = false) => {
        console.log('🔍 Smart discovery - checking backwards from today...');
        
        const foundDates = [];
        const today = new Date();
        const maxDaysBack = 30; // Check only 30 days backwards
        
        const promises = [];
        
        // Check from today going backwards (today, yesterday, day before, etc.)
        for (let i = 0; i <= maxDaysBack; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            promises.push(checkDateExists(formatDateForFile(checkDate)));
        }
        
        // Wait for all checks to complete
        const results = await Promise.all(promises);
        
        // Collect successful dates
        results.forEach(result => {
            if (result.exists) {
                foundDates.push(result.date);
                console.log(`✅ Found: ${result.date}`);
            }
        });
        
        // Sort newest first (already in correct order since we checked from newest to oldest)
        availableDates = foundDates.sort().reverse();
        
        console.log('📅 Discovered available dates:', availableDates);
        console.log(`🎯 Total files found: ${availableDates.length}`);
        return availableDates;
    };
    
    const checkDateExists = async (dateStr) => {
        try {
            const response = await fetch(`data/matches_full_${dateStr}.json`, { method: 'HEAD' });
            return { date: dateStr, exists: response.ok };
        } catch (error) {
            return { date: dateStr, exists: false };
        }
    };

    const formatDateForDisplay = (date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Check if this is the actual today
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } 
        // Check if this is yesterday
        else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } 
        // Check if this is tomorrow
        else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } 
        // Check if date is within this year
        else if (date.getFullYear() === today.getFullYear()) {
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric'
            });
        }
        // Different year - show full format
        else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        }
    };

    const updateDateDisplay = () => {
        const dateTextElement = document.getElementById('current-date-text');
        const dateFullElement = document.getElementById('current-date-full');
        
        console.log(`🔄 UpdateDateDisplay - Index: ${currentDateIndex}, Date: ${availableDates[currentDateIndex] || 'none'}`);
        
        if (dateTextElement && availableDates.length > 0) {
            dateTextElement.textContent = formatDateForDisplay(currentDate);
        }
        
        if (dateFullElement) {
            dateFullElement.textContent = currentDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('prev-date-btn');
        const nextBtn = document.getElementById('next-date-btn');
        
        if (prevBtn && nextBtn && availableDates.length > 0) {
            // Next disabled if at index 0 (newest)
            nextBtn.disabled = currentDateIndex === 0;
            // Prev disabled if at last index (oldest)
            prevBtn.disabled = currentDateIndex === availableDates.length - 1;
            
            console.log(`🔘 Buttons: Next ${nextBtn.disabled ? 'OFF' : 'ON'}, Prev ${prevBtn.disabled ? 'OFF' : 'ON'}`);
        }
        
        // Update strategy filter visibility
        updateStrategyFilterVisibility();
    };

    const updateStrategyFilterVisibility = () => {
        const filtersPanel = document.querySelector('.filters-panel');
        if (!filtersPanel) return;
        
        // Check if current date is "Today"
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();
        
        console.log(`🔄 UpdateStrategyFilterVisibility - isToday: ${isToday}, currentFilters.hideStarted: ${currentFilters.hideStarted}`);
        
        if (isToday) {
            // Show entire filters panel for "Today"
            filtersPanel.style.display = 'grid';
            
            // Restore default state for Today filters
            if (!currentFilters.hideStarted) {
                currentFilters.hideStarted = true;
                hideStartedToggle.checked = true;
                console.log('✅ Restored hideStarted toggle to active for Today - will trigger render');
                // The UI will be re-rendered by the calling function
            }
        } else {
            // Hide entire filters panel for past dates
            filtersPanel.style.display = 'none';
            // Reset all filters when hidden
            currentFilters.strategy = '';
            currentFilters.sortTime = '';
            currentFilters.hideStarted = false;
            hideStartedToggle.checked = false;
            updateSelectedStrategy();
            updateSelectedSortTime();
            
            // Reset other filters too
            currentFilters.competition = '';
            currentFilters.confidence = '';
            updateSelectedCountry();
            updateSelectedConfidence();
            
            console.log('🔄 Reset all filters for non-Today date');
        }
    };

    // --- Initialization ---
    const initializeApp = async () => {
        try {
            loadingElement.style.display = 'block';
            
            console.log('🚀 InitializeApp - Starting...');
            
            // Discover available dates
            await discoverAvailableDates();
            
            if (availableDates.length === 0) {
                throw new Error('No match data available');
            }
            
            console.log('📅 Available dates:', availableDates);
            
            // Start with index 0 (most recent date)
            currentDateIndex = 0;
            const startDate = availableDates[currentDateIndex];
            
            console.log(`✅ Starting with: ${startDate} (index ${currentDateIndex})`);
            
            currentDate = new Date(startDate + 'T00:00:00');
            await fetchData(startDate);
            
        } catch (error) {
            console.error("❌ Failed to initialize app:", error);
            matchesListSection.innerHTML = `<div class="no-results-state" style="display: block;"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Data</h3><p>No match data available</p></div>`;
            loadingElement.style.display = 'none';
        }
    };

    const fetchData = async (dateStr = null) => {
        try {
            loadingElement.style.display = 'block';
            
            // Reset filters and static stats when changing date
            currentStatFilter = null;
            staticStatsDetails = null;
            
            // If no date specified, use current date
            if (!dateStr) {
                dateStr = formatDateForFile(currentDate);
            }
            
            console.log(`📥 FetchData - Loading data for: ${dateStr}`);
            
            const response = await fetch(`data/matches_full_${dateStr}.json`);
            if (!response.ok) throw new Error(`No data available for ${dateStr}`);
            allMatchesData = await response.json();
            
            console.log(`✅ FetchData - Successfully loaded ${allMatchesData.length} competitions for ${dateStr}`);
            
            populateFilters();
            updateStrategyFilterVisibility();
            console.log(`🔧 After updateStrategyFilterVisibility: hideStarted = ${currentFilters.hideStarted}`);
            renderUI();
            updateDateDisplay();
        } catch (error) {
            console.error("❌ FetchData - Failed to load match data:", error);
            matchesListSection.innerHTML = `<div class="no-results-state" style="display: block;"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Data</h3><p>No matches available for ${formatDateForDisplay(currentDate)}</p><button class="reset-filters-btn" onclick="goToToday()">Go to Today</button></div>`;
        } finally {
            loadingElement.style.display = 'none';
        }
    };

    const goToToday = async () => {
        console.log('🏠 GoToToday - Going to most recent date...');
        
        if (availableDates.length === 0) {
            console.error('❌ No dates available');
            return;
        }
        
        // Go to index 0 (most recent)
        currentDateIndex = 0;
        const todayDate = availableDates[currentDateIndex];
        
        console.log(`✅ GoToToday - Using: ${todayDate}`);
        
        currentDate = new Date(todayDate + 'T00:00:00');
        await fetchData(todayDate);
    };

    // Make goToToday globally accessible
    window.goToToday = goToToday;
    

    

























    

    

        const opportunities = [];
        
        // Over/Under 2.5 Goals
        const over25Prob = parseFloat(predictions.over_2_5_goals_probability) || 0;
        const under25Prob = 100 - over25Prob;
        
        if (over25Prob >= 75) {
            opportunities.push({
                title: "PARIAZĂ PE MULTE GOLURI (OVER 2.5)",
                confidence: Math.round(over25Prob),
                explanation: `Meciul are ${over25Prob.toFixed(1)}% șanse pentru 3+ goluri. Echipele au atac puternic!`,
                profit: 75,
                risk: "MEDIU",
                riskScore: 100 - over25Prob,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Caută meciul în secțiunea "Goals"`,
                    `⬆️ Apasă BACK pe "Over 2.5 Goals"`,
                    `💰 Pune 75-150 lei`,
                    `✅ Câștigi dacă sunt 3+ goluri în meci`
                ]
            });
        }
        
        if (under25Prob >= 75) {
            opportunities.push({
                title: "PARIAZĂ PE PUȚINE GOLURI (UNDER 2.5)",
                confidence: Math.round(under25Prob),
                explanation: `Meciul are ${under25Prob.toFixed(1)}% șanse pentru max 2 goluri. Apărări solide!`,
                profit: 75,
                risk: "MEDIU",
                riskScore: 100 - under25Prob,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Caută meciul în secțiunea "Goals"`,
                    `⬇️ Apasă BACK pe "Under 2.5 Goals"`,
                    `💰 Pune 75-150 lei`,
                    `✅ Câștigi dacă sunt max 2 goluri în meci`
                ]
            });
        }
        
        // Over/Under 1.5 Goals
        const over15Prob = parseFloat(predictions.over_1_5_goals_probability) || 0;
        if (over15Prob >= 85) {
            opportunities.push({
                title: "SIGURANȚĂ: OVER 1.5 GOLURI",
                confidence: Math.round(over15Prob),
                explanation: `${over15Prob.toFixed(1)}% șanse pentru minim 2 goluri. Aproape sigur!`,
                profit: 35,
                risk: "FOARTE SCĂZUT",
                riskScore: 100 - over15Prob,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Mergi la "Goals" > "Over/Under 1.5"`,
                    `✅ BACK pe "Over 1.5 Goals"`,
                    `💰 Pariază mai mult: 150-300 lei (risc mic)`,
                    `🏆 Profit mic dar aproape sigur`
                ]
            });
        }
        
        return opportunities;
    }
    
    // ALGORITM 3: SCORURI EXACTE
    function analyzeCorrectScores(match, correctScores, odds) {
        const opportunities = [];
        
        correctScores.forEach(scoreData => {
            const probability = parseFloat(scoreData.probability) || 0;
            if (probability >= 15) { // Scoruri cu șanse mari
                opportunities.push({
                    title: `SCOR EXACT: ${scoreData.score}`,
                    confidence: Math.round(probability * 3), // Amplificat pentru scoruri exacte
                    explanation: `Scorul ${scoreData.score} are ${probability.toFixed(1)}% șanse. Cota mare, risc controlat!`,
                    profit: 800, // Scorurile exacte au profituri mari
                    risk: "RIDICAT",
                    riskScore: 100 - probability,
                    steps: [
                        `🎯 Intră pe Betfair Exchange`,
                        `🔍 Mergi la "Correct Score"`,
                        `🎲 Apasă BACK pe "${scoreData.score}"`,
                        `💰 Pune doar 20-50 lei (risc mare)`,
                        `🎊 Jackpot dacă scorul e exact ${scoreData.score}!`
                    ]
                });
            }
        });
        
        return opportunities;
    }
    
    // ALGORITM 4: LAYING STRATEGIES
    function analyzeLayingStrategies(match, predictions, odds, marketAnalysis) {
        const opportunities = [];
        
        // Lay the Draw
        const drawProb = parseFloat(predictions.draw_probability) || 0;
        const drawOdds = parseFloat(odds.draw) || 0;
        
        if (drawProb <= 20 && drawOdds >= 4.0) {
            const liability = Math.round((drawOdds - 1) * 100);
            opportunities.push({
                title: "LAY THE DRAW (Împotriva Egalului)",
                confidence: Math.round(100 - drawProb),
                explanation: `Egalul are doar ${drawProb.toFixed(1)}% șanse. Lay-ul oferă profit la orice rezultat diferit!`,
                profit: Math.round(100 / drawOdds * 100),
                risk: "RIDICAT",
                riskScore: drawProb + 30,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Mergi la "Match Odds"`,
                    `❌ Apasă LAY (roz) pe "The Draw"`,
                    `💰 Pune max 50 lei (risc: ${liability} lei)`,
                    `✅ Câștigi dacă NU e egal (orice altceva)`
                ]
            });
        }
        
        return opportunities;
    }
    
    // ALGORITM 5: ASIAN HANDICAP
    function analyzeHandicapMarkets(match, predictions, odds, teamValues) {
        const opportunities = [];
        
        const homeStrength = parseFloat(teamValues.home_team_value) || 0;
        const awayStrength = parseFloat(teamValues.away_team_value) || 0;
        const strengthDiff = Math.abs(homeStrength - awayStrength);
        
        if (strengthDiff >= 15) {
            const strongerTeam = homeStrength > awayStrength ? match.home_team : match.away_team;
            opportunities.push({
                title: `HANDICAP: ${strongerTeam.toUpperCase()} -1`,
                confidence: 70,
                explanation: `${strongerTeam} e mult mai puternic (diferență ${strengthDiff.toFixed(1)}%). Handicap -1 e profitabil!`,
                profit: 85,
                risk: "MEDIU",
                riskScore: 40,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Mergi la "Asian Handicap"`,
                    `⚖️ Apasă BACK pe "${strongerTeam} -1"`,
                    `💰 Pune 100-150 lei`,
                    `✅ Câștigi dacă ${strongerTeam} câștigă cu 2+ goluri`
                ]
            });
        }
        
        return opportunities;
    }
    
    // ALGORITM 6: FIRST HALF / SECOND HALF
    function analyzeHalfTimeMarkets(match, predictions, odds) {
        const opportunities = [];
        
        // First Half Over 0.5 Goals
        const firstHalfGoals = parseFloat(predictions.first_half_goals) || 0;
        if (firstHalfGoals >= 80) {
            opportunities.push({
                title: "PRIMUL GOL ÎN REPRIZA 1",
                confidence: Math.round(firstHalfGoals),
                explanation: `${firstHalfGoals.toFixed(1)}% șanse pentru gol în prima repriză. Start rapid!`,
                profit: 50,
                risk: "SCĂZUT",
                riskScore: 100 - firstHalfGoals,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Mergi la "Half Time Markets"`,
                    `⚽ BACK pe "1st Half Over 0.5 Goals"`,
                    `💰 Pune 100-200 lei`,
                    `✅ Câștigi dacă e gol în prima repriză`
                ]
            });
        }
        
        return opportunities;
    }
    
    // ALGORITM 7: BOTH TEAMS TO SCORE
    function analyzeBTTSMarkets(match, predictions, odds) {
        const opportunities = [];
        
        const bttsProb = parseFloat(predictions.both_teams_score_probability) || 0;
        
        if (bttsProb >= 70) {
            opportunities.push({
                title: "AMBELE ECHIPE MARCHEAZĂ",
                confidence: Math.round(bttsProb),
                explanation: `${bttsProb.toFixed(1)}% șanse ca ambele echipe să marcheze. Atacuri puternice!`,
                profit: 90,
                risk: "MEDIU",
                riskScore: 100 - bttsProb,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Mergi la "Both Teams to Score"`,
                    `⚽⚽ BACK pe "Yes"`,
                    `💰 Pune 75-150 lei`,
                    `✅ Câștigi dacă ambele echipe marchează`
                ]
            });
        } else if (bttsProb <= 30) {
            opportunities.push({
                title: "NU AMBELE ECHIPE MARCHEAZĂ",
                confidence: Math.round(100 - bttsProb),
                explanation: `Doar ${bttsProb.toFixed(1)}% șanse ca ambele să marcheze. O echipă nu va marca!`,
                profit: 75,
                risk: "MEDIU",
                riskScore: bttsProb + 20,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Mergi la "Both Teams to Score"`,
                    `❌ BACK pe "No"`,
                    `💰 Pune 75-150 lei`,
                    `✅ Câștigi dacă o echipă nu marchează`
                ]
            });
        }
        
        return opportunities;
    }
    
    // ALGORITM 8: PIEȚE SPECIALE
    function analyzeSpecialMarkets(match, predictions, odds) {
        const opportunities = [];
        
        // Total Corners
        const corners = parseFloat(predictions.total_corners) || 0;
        if (corners >= 12) {
            opportunities.push({
                title: "MULTE CORNERE (OVER 10.5)",
                confidence: 75,
                explanation: `Se estimează ${corners.toFixed(0)} cornere. Meciuri cu multe atacuri = multe cornere!`,
                profit: 85,
                risk: "MEDIU",
                riskScore: 35,
                steps: [
                    `🎯 Intră pe Betfair Exchange`,
                    `🔍 Mergi la "Corners"`,
                    `📐 BACK pe "Over 10.5 Corners"`,
                    `💰 Pune 50-100 lei`,
                    `✅ Câștigi dacă sunt 11+ cornere`
                ]
            });
        }
        
        return opportunities;
    }



    function generateStrategyHTML(analysis, match) {
        if (!analysis || !analysis.bestStrategy) {
            return '<div class="simple-strategy"><p>❌ Nu s-a putut genera tactica.</p></div>';
        }
        
        // Culori simple pentru confidence
        let confidenceColor = '#ff4757'; // roșu
        if (analysis.confidence >= 70) confidenceColor = '#2ed573'; // verde
        else if (analysis.confidence >= 50) confidenceColor = '#ffa502'; // portocaliu
        
        // Culori pentru risc
        let riskColor = '#2ed573'; // verde
        if (analysis.risk === 'MEDIU') riskColor = '#ffa502';
        if (analysis.risk === 'RIDICAT') riskColor = '#ff4757';
        
        // Emoji pentru risc
        let riskEmoji = '✅';
        if (analysis.risk === 'MEDIU') riskEmoji = '⚠️';
        if (analysis.risk === 'RIDICAT') riskEmoji = '🚨';
        
        return `
            <div class="simple-strategy">
                <div class="tactic-header">
                    <h2>${analysis.bestStrategy}</h2>
                    <div class="confidence-circle" style="background: ${confidenceColor}">
                        ${analysis.confidence}%
                    </div>
                </div>
                
                <div class="tactic-explanation">
                    <p>${analysis.explanation}</p>
                </div>
                
                <div class="tactic-info">
                    <div class="info-item">
                        <span class="info-icon">💰</span>
                        <span class="info-text">Profit: <strong>${analysis.profit}%</strong></span>
                    </div>
                    <div class="info-item">
                        <span class="info-icon">${riskEmoji}</span>
                        <span class="info-text">Risc: <strong style="color: ${riskColor}">${analysis.risk}</strong></span>
                    </div>
                </div>
                
                <div class="action-steps">
                    <h3>Ce să faci:</h3>
                    <div class="steps">
                        ${analysis.steps.map((step, index) => 
                            `<div class="step">
                                <span class="step-number">${index + 1}</span>
                                <span class="step-text">${step}</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                
                ${analysis.profit > 0 ? `
                <div class="final-tip">
                    <strong>💡 Important:</strong> Pariază doar bani pe care îi poți pierde!
                </div>
                ` : ''}
            </div>
        `;
    }
    
    // STRATEGIC MATRIX BUILDER
    const buildStrategicMatrix = (valueAnalysis, predictions, marketAnalysis) => {
        const topScore = predictions.top_3_correct_scores[0];
        const goalMarkets = predictions.goals_markets;
        const teamMarkets = predictions.teams_markets;
        
        return {
            // Main markets value
            mainMarkets: valueAnalysis,
            
            // Goals strategy matrix
            goalsMatrix: {
                over15Value: (goalMarkets.over_1_5 > 85) ? calculateGoalValue(goalMarkets.over_1_5, 1.15) : null,
                over25Value: (goalMarkets.over_2_5 > 70 && goalMarkets.over_2_5 < 85) ? calculateGoalValue(goalMarkets.over_2_5, 1.25) : null,
                under25Value: (goalMarkets.under_2_5 > 25 && goalMarkets.under_2_5 < 40) ? calculateGoalValue(goalMarkets.under_2_5, 1.35) : null,
                bttsValue: (teamMarkets.both_teams_score > 60 && teamMarkets.both_teams_score < 80) ? calculateGoalValue(teamMarkets.both_teams_score, 1.8) : null
            },
            
            // Correct score opportunities
            correctScoreMatrix: {
                topScore: {
                    score: topScore.score,
                    probability: topScore.percentage,
                    impliedOdds: 100 / topScore.percentage,
                    value: topScore.percentage > 8 ? (100 / topScore.percentage) * 0.85 : null
                },
                halftimeScore: {
                    score: predictions.most_likely_halftime_score.score,
                    probability: predictions.most_likely_halftime_score.percentage,
                    value: predictions.most_likely_halftime_score.percentage > 15
                }
            },
            
            // Team strength analysis
            teamStrengthMatrix: {
                homeStrength: predictions.team_values.home_team_value,
                awayStrength: predictions.team_values.away_team_value,
                strengthDiff: Math.abs(predictions.team_values.home_team_value - predictions.team_values.away_team_value),
                dominance: marketAnalysis.odds_strength_ratio
            }
        };
    };
    
    // PROFESSIONAL STRATEGY GENERATOR
    const generateProfessionalStrategies = (matrix, predictions, odds) => {
        const strategies = [];
        
        // STRATEGY 1: HIGH-VALUE BACK PLAY
        const bestMainValue = matrix.mainMarkets.reduce((max, current) => 
            current.valuePercent > max.valuePercent ? current : max
        );
        
        if (bestMainValue.hasValue && bestMainValue.confidence > 60) {
            const entryOdds = bestMainValue.bookmakerOdds;
            const targetOdds = entryOdds * 0.93; // 7% movement target
            const stopLoss = entryOdds * 1.12; // 12% stop loss
            const kellyOptimal = Math.min(bestMainValue.kellyStake, 6);
            
            strategies.push({
                type: 'PROFESSIONAL BACK STRATEGY',
                market: bestMainValue.market,
                reasoning: `Value: ${bestMainValue.valuePercent.toFixed(1)}% | EV: ${(bestMainValue.expectedValue * 100).toFixed(1)}% | Sharpe: ${bestMainValue.sharpeRatio.toFixed(2)}`,
                execution: {
                    phase: 'PRE-MATCH',
                    entryMethod: 'BACK',
                    entryOdds: entryOdds.toFixed(2),
                    targetOdds: targetOdds.toFixed(2),
                    stopLoss: stopLoss.toFixed(2),
                    stake: `${kellyOptimal.toFixed(1)}% (Kelly Optimal)`,
                    timing: 'Intră cu 30-60 min înainte de meci pentru lichiditate maximă'
                },
                tactics: {
                    entry: `1. Setează BACK bet la ${entryOdds.toFixed(2)} cu ${kellyOptimal.toFixed(1)}% din bankroll`,
                    management: `2. Dacă cotele scad la ${targetOdds.toFixed(2)}, setează LAY pentru green-up`,
                    protection: `3. Stop-loss automat la ${stopLoss.toFixed(2)} (max 12% pierdere)`,
                    alternative: `4. Dacă nu se execută, reduce stake la jumătate și reîncearcă`
                },
                expectedProfit: `${((targetOdds / entryOdds - 1) * kellyOptimal).toFixed(1)}% profit la green-up`,
                priority: 'HIGH'
            });
        }
        
        // STRATEGY 2: GOALS ARBITRAGE
        if (matrix.goalsMatrix.over25Value && matrix.goalsMatrix.over25Value > 5) {
            const over25Prob = predictions.goals_markets.over_2_5;
            const fairOdds = 100 / over25Prob;
            const marketOdds = fairOdds * 1.1; // Assume 10% margin
            
            strategies.push({
                type: 'GOALS MARKET EXPLOITATION',
                market: 'Over 2.5 Goals',
                reasoning: `Probabilitate: ${over25Prob}% | Value estimat: ${matrix.goalsMatrix.over25Value.toFixed(1)}%`,
                execution: {
                    phase: 'PRE-MATCH + IN-PLAY',
                    entryMethod: 'BACK + LAY COMBO',
                    entryOdds: fairOdds.toFixed(2),
                    targetOdds: (fairOdds * 0.9).toFixed(2),
                    stake: '3-4% din bankroll',
                    timing: 'Intră pre-match, ajustează după primul gol'
                },
                tactics: {
                    preMatch: `1. BACK Over 2.5 la ${fairOdds.toFixed(2)} cu 3% bankroll`,
                    firstGoal: `2. După primul gol (min 15-60), LAY Under 2.5 pentru green-up`,
                    noGoalHT: `3. La pauză fără gol, LAY Over 2.5 pentru minimizare pierderi`,
                    lateGame: `4. După min 70 cu 2+ goluri, LAY Over 2.5 pentru profit garantat`
                },
                expectedProfit: '8-15% profit cu execuție corectă',
                priority: 'MEDIUM'
            });
        }
        
        // STRATEGY 3: CORRECT SCORE VALUE PLAY
        if (matrix.correctScoreMatrix.topScore.probability > 8) {
            const csOdds = matrix.correctScoreMatrix.topScore.impliedOdds;
            const targetOdds = csOdds * 0.8;
            
            strategies.push({
                type: 'CORRECT SCORE VALUE',
                market: `Scor exact ${matrix.correctScoreMatrix.topScore.score}`,
                reasoning: `Probabilitate: ${matrix.correctScoreMatrix.topScore.probability}% | Cotă fair: ${csOdds.toFixed(1)}`,
                execution: {
                    phase: 'PRE-MATCH ONLY',
                    entryMethod: 'SMALL BACK STAKE',
                    entryOdds: csOdds.toFixed(1),
                    targetOdds: targetOdds.toFixed(1),
                    stake: '1-2% din bankroll (high risk)',
                    timing: 'Ultimele 30 min înainte de meci'
                },
                tactics: {
                    entry: `1. BACK ${matrix.correctScoreMatrix.topScore.score} la ${csOdds.toFixed(1)} cu 1% bankroll`,
                    hedge: `2. Dacă scorul devine probabil în-play, LAY pentru green-up`,
                    cutLoss: `3. La sfârșitul T1 cu scor diferit, consideră trade-out`,
                    holdToEnd: `4. Dacă merge bine, ține până la final (high reward)`
                },
                expectedProfit: `${((csOdds - 1) * 1).toFixed(0)}% profit maxim, risc mare`,
                priority: 'LOW'
            });
        }
        
        return strategies.length > 0 ? strategies : [{
            type: 'NO HIGH-VALUE OPPORTUNITIES',
            market: 'SKIP THIS MATCH',
            reasoning: 'Nu există value suficient pentru strategii profesionale',
            execution: { phase: 'WAIT', advice: 'Caută alte meciuri cu value mai mare' },
            priority: 'SKIP'
        }];
    };
    
    // AUXILIARY CALCULATION FUNCTIONS
    const calculateLiquidityScore = (odds, efficiency) => {
        const spread = Math.max(...odds) - Math.min(...odds);
        const avgOdds = odds.reduce((a, b) => a + b, 0) / odds.length;
        return Math.min(100, (efficiency * 100) - (spread / avgOdds * 20));
    };
    
    const calculateVolatilityIndex = (predictions, marketAnalysis) => {
        const topScoreProb = predictions.top_3_correct_scores[0].percentage;
        const goalVariance = Math.abs(predictions.goals_markets.over_2_5 - 50);
        const strengthDiff = Math.abs(predictions.team_values.home_team_value - predictions.team_values.away_team_value);
        return (topScoreProb * 0.3) + (goalVariance * 0.4) + (strengthDiff * 0.3);
    };
    
    const calculateGoalValue = (probability, targetOdds) => {
        const impliedOdds = 100 / probability;
        return ((targetOdds - impliedOdds) / impliedOdds) * 100;
    };
    
    // ADVANCED LAYING & ARBITRAGE ANALYZER
    const analyzeAdvancedLayingOpportunities = (valueAnalysis, marketAnalysis, predictions) => {
        const layOpportunities = [];
        
        // OVERPRICED MARKET LAYING
        valueAnalysis.forEach(analysis => {
            if (analysis.valuePercent < -8) { // Overpriced threshold lowered
                const liability = analysis.bookmakerOdds - 1;
                const optimalLayOdds = analysis.bookmakerOdds * 1.08; // 8% target
                const maxLiability = Math.min(liability * 2, 10); // Max 10% liability
                
                layOpportunities.push({
                    type: 'OVERPRICED LAY',
                    market: analysis.market,
                    reasoning: `Suprapricurat cu ${Math.abs(analysis.valuePercent).toFixed(1)}% | Sharpe: ${analysis.sharpeRatio.toFixed(2)}`,
                    execution: {
                        phase: 'PRE-MATCH',
                        entryMethod: 'LAY',
                        layOdds: analysis.bookmakerOdds.toFixed(2),
                        targetOdds: optimalLayOdds.toFixed(2),
                        liability: `${liability.toFixed(2)}x stake (max ${maxLiability}%)`,
                        timing: 'Intră cu 45-90 min înainte de meci'
                    },
                    tactics: {
                        entry: `1. LAY ${analysis.market} la ${analysis.bookmakerOdds.toFixed(2)} cu liability ${liability.toFixed(1)}x`,
                        management: `2. Dacă cotele cresc la ${optimalLayOdds.toFixed(2)}, BACK pentru green-up`,
                        protection: `3. Stop-loss la ${(analysis.bookmakerOdds * 0.92).toFixed(2)} (max 8% loss)`,
                        alternative: `4. Consider cash-out la 50% profit target`
                    },
                    expectedProfit: `${(8 / liability).toFixed(1)}% profit la target`,
                    confidence: 'HIGH'
                });
            }
        });
        
        // FAVORITES LAYING STRATEGY
        const favorite = valueAnalysis.reduce((min, current) => 
            current.bookmakerOdds < min.bookmakerOdds ? current : min
        );
        
        if (favorite.bookmakerOdds < 1.5 && favorite.ourProb < 0.75) {
            const layStake = 3; // Fixed 3% for favorite laying
            const liability = (favorite.bookmakerOdds - 1) * layStake;
            
            layOpportunities.push({
                type: 'FAVORITE LAYING',
                market: favorite.market,
                reasoning: `Favorit suprapicat: Cotă ${favorite.bookmakerOdds} vs Prob ${(favorite.ourProb * 100).toFixed(1)}%`,
                execution: {
                    phase: 'PRE-MATCH + IN-PLAY',
                    entryMethod: 'PROGRESSIVE LAY',
                    layOdds: favorite.bookmakerOdds.toFixed(2),
                    targetOdds: (favorite.bookmakerOdds * 1.15).toFixed(2),
                    liability: `${liability.toFixed(1)}% din bankroll`,
                    timing: 'Început cu 50% pre-match, 50% în primele 15 min'
                },
                tactics: {
                    preMatch: `1. LAY ${favorite.market} cu 1.5% bankroll pre-match`,
                    earlyInPlay: `2. Dacă favoritul nu domină în primele 15 min, adaugă încă 1.5%`,
                    hedge: `3. La primul gol contra favoritului, BACK pentru green-up masiv`,
                    cutLoss: `4. La 2-0 pentru favorit, cut losses rapid`
                },
                expectedProfit: '12-25% profit dacă favoritul dezamăgește',
                confidence: 'MEDIUM'
            });
        }
        
        return layOpportunities;
    };
    
    // SOPHISTICATED IN-PLAY STRATEGY GENERATOR
    const generateAdvancedInPlayStrategy = (predictions, marketAnalysis, odds) => {
        const strategies = [];
        
        // GOAL-BASED DYNAMIC TRADING
        const bttsProb = predictions.teams_markets.both_teams_score;
        const over25Prob = predictions.goals_markets.over_2_5;
        
        strategies.push({
            type: 'GOALS MOMENTUM TRADING',
            triggers: [
                {
                    minute: '0-15',
                    scenario: 'Primul gol',
                    action: `Dacă primul gol vine în min 1-15: BACK Over 2.5 la cote mai mici`,
                    reasoning: `Meciul se "deschide" rapid, ${over25Prob}% probabilitate Over 2.5`,
                    execution: `LAY Under 2.5 la 1.8-2.2 pentru green-up`
                },
                {
                    minute: '15-30',
                    scenario: 'Meciul rămâne 0-0',
                    action: `BACK Under 2.5 Goals cu stakes mărite`,
                    reasoning: `Fără gol în primele 30 min, scade probabilitatea Over 2.5`,
                    execution: `Intrare progresivă: 2% la min 20, +1% la min 30`
                },
                {
                    minute: '45+',
                    scenario: 'Primul tempo fără goluri',
                    action: `MASSIVE LAY Over 2.5 + BACK Under 2.5`,
                    reasoning: `Dramatically reduced goal expectancy`,
                    execution: `All-in pe Under 2.5 dacă cotele sunt peste 2.0`
                }
            ]
        });
        
        // COMEBACK/MOMENTUM STRATEGIES
        const favorite = odds.indexOf(Math.min(...odds));
        const favoriteProb = [marketAnalysis.home_win_prob, marketAnalysis.draw_prob, marketAnalysis.away_win_prob][favorite];
        
        if (favoriteProb > 0.55) {
            strategies.push({
                type: 'FAVORITE MOMENTUM TRADING',
                triggers: [
                    {
                        minute: '1-20',
                        scenario: 'Favoritul primește primul gol',
                        action: `URGENT LAY pe favorit, BACK celelalte rezultate`,
                        reasoning: `Momentul perfect pentru lay - cotele vor scădea dramatic`,
                        execution: `LAY favorit cu 4-6% bankroll, target profit 15-25%`
                    },
                    {
                        minute: '70-85',
                        scenario: 'Favoritul conduce cu 1 gol',
                        action: `BACK Draw + Away Win pentru insurance`,
                        reasoning: `Late goals sunt comune, protejează profitul`,
                        execution: `Split stake: 60% Draw, 40% celălalt rezultat`
                    }
                ]
            });
        }
        
        // HALFTIME CORRECTION STRATEGY
        const htScore = predictions.most_likely_halftime_score;
        if (htScore.percentage > 18) {
            strategies.push({
                type: 'HALFTIME CORRECTION TRADING',
                triggers: [
                    {
                        minute: '45-47',
                        scenario: `HT scor diferit de ${htScore.score}`,
                        action: `BACK scorul prezis pentru FT`,
                        reasoning: `${htScore.percentage}% probabilitate HT, correction possible`,
                        execution: `Stake mărit cu 50% față de pre-match pentru recovery`
                    },
                    {
                        minute: '45-47',
                        scenario: `HT scor exact ${htScore.score}`,
                        action: `LAY acest scor pentru FT, BACK alternatives`,
                        reasoning: `Scorul e deja atins, probabilitate redusă să rămână`,
                        execution: `LAY FT ${htScore.score} cu 3% bankroll`
                    }
                ]
            });
        }
        
        // LATE GAME ARBITRAGE
        strategies.push({
            type: 'LATE GAME SCALPING',
            triggers: [
                {
                    minute: '80-90',
                    scenario: 'Orice scor stabil',
                    action: `Rapid scalping pe fluctuații mici de cotă`,
                    reasoning: `High liquidity, micro-movements profitable`,
                    execution: `Back/Lay same market cu diferențe de 0.02-0.05 cotă`
                },
                {
                    minute: '87-90',
                    scenario: 'Rezultat apropiat de predicții',
                    action: `Cash-out toate pozițiile active`,
                    reasoning: `Protect profits, avoid last-minute drama`,
                    execution: `Green-up toate pozițiile, lock-in 70% din profit`
                }
            ]
        });
        
        return strategies;
    };
    
    // MARKET TIMING ANALYSIS
    const analyzeMarketTiming = (match, predictions, marketAnalysis) => {
        const matchTime = match.time;
        const [hours, minutes] = matchTime.split(':').map(Number);
        const matchDateTime = new Date();
        matchDateTime.setHours(hours, minutes, 0, 0);
        
        const timeToMatch = (matchDateTime - new Date()) / (1000 * 60); // Minutes
        
        return {
            optimalEntryWindows: [
                {
                    period: '90-120 min înainte',
                    action: 'SCOUTING & ANALYSIS',
                    reasoning: 'Monitorizează mișcările de cotă, identifică trendurile',
                    tactics: 'Nu paria încă, doar observă și pregătește strategiile'
                },
                {
                    period: '60-90 min înainte',
                    action: 'PRIMARY ENTRIES',
                    reasoning: 'Lichiditate optimă, cotele încă nu sunt "locked"',
                    tactics: 'Execută 70% din strategiile planificate'
                },
                {
                    period: '30-60 min înainte',
                    action: 'AGGRESSIVE POSITIONING',
                    reasoning: 'Ultimele oportunități de value înainte de kick-off',
                    tactics: 'Restul de 30% + oportunități last-minute'
                },
                {
                    period: '0-30 min înainte',
                    action: 'FINE-TUNING ONLY',
                    reasoning: 'Cotele aproape finale, doar ajustări minore',
                    tactics: 'Micro-adjustments, hedge protection bets'
                }
            ],
            
            currentRecommendation: timeToMatch > 90 ? 'ANALYZE' :
                                  timeToMatch > 60 ? 'ENTER PRIMARY' :
                                  timeToMatch > 30 ? 'AGGRESSIVE POSITION' :
                                  timeToMatch > 0 ? 'FINE-TUNE' : 'IN-PLAY MODE',
            
            liquidityForecast: {
                preMatch: Math.min(100, 70 + (timeToMatch / 2)),
                inPlay: 95,
                recommendation: timeToMatch > 60 ? 'EXCELLENT' : 
                               timeToMatch > 30 ? 'GOOD' : 'AVERAGE'
            }
        };
    };
    
    // Risk Management Calculator
    // ADVANCED RISK MANAGEMENT SYSTEM
    const calculateAdvancedRiskManagement = (valueAnalysis, efficiency, volatilityIndex) => {
        const baseRisk = efficiency * 18; // Base risk from market efficiency
        const volatilityAdjustment = Math.max(0.5, 1 - (volatilityIndex / 100)); // Reduce risk for high volatility
        const maxTotalRisk = Math.min(20, baseRisk * volatilityAdjustment);
        
        // KELLY CRITERION OPTIMIZATION
        const kellyOptimal = valueAnalysis.reduce((total, analysis) => {
            if (analysis.hasValue) {
                return total + Math.min(analysis.kellyStake || 0, 6); // Cap at 6%
            }
            return total;
        }, 0);
        
        // DYNAMIC POSITION SIZING
        const positionSizing = {
            conservative: kellyOptimal * 0.25, // 25% Kelly
            moderate: kellyOptimal * 0.5,      // 50% Kelly  
            aggressive: kellyOptimal * 0.75    // 75% Kelly
        };
        
        return {
            riskProfile: {
                maxTotalExposure: `${maxTotalRisk.toFixed(1)}% din bankroll`,
                volatilityAdjusted: `Risc ajustat pentru volatilitatea de ${volatilityIndex.toFixed(1)}%`,
                marketEfficiency: `Eficiența pieței: ${(efficiency * 100).toFixed(1)}%`
            },
            
            positionSizing: {
                conservative: `${positionSizing.conservative.toFixed(1)}% (Risk-Averse)`,
                moderate: `${positionSizing.moderate.toFixed(1)}% (Balanced)`,
                aggressive: `${positionSizing.aggressive.toFixed(1)}% (Growth-Focused)`,
                recommended: efficiency > 0.93 ? 'moderate' : 'conservative'
            },
            
            protectionStrategies: {
                stopLoss: 'Stop-loss automat la -10% pe poziție',
                hedging: 'Hedge obligatoriu la +15% profit',
                diversification: 'Max 3 pozițiile active simultan',
                maxDrawdown: 'Max 5% bankroll loss pe zi'
            },
            
            bankrollManagement: {
                unitSize: '1% bankroll = 1 unitate',
                maxUnitsPerDay: Math.floor(maxTotalRisk),
                emergencyFund: '20% bankroll nedisponibil pentru pariuri',
                growthTarget: '2-5% bankroll growth pe lună'
            }
        };
    };
    
    // LEGACY FUNCTION FOR COMPATIBILITY
    const calculateRiskManagement = (valueAnalysis, efficiency) => {
        const volatilityIndex = 50; // Default volatility
        const advanced = calculateAdvancedRiskManagement(valueAnalysis, efficiency, volatilityIndex);
        return {
            maxStakePercent: parseFloat(advanced.positionSizing.moderate),
            stopLossPercent: 10,
            diversification: advanced.protectionStrategies.diversification,
            kelly: `Kelly Optimal: ${advanced.positionSizing.moderate}`
        };
    };
    
    // ADVANCED CONFIDENCE CALCULATOR
    const calculateAdvancedConfidence = (valueAnalysis, efficiency, predictions, volatilityIndex) => {
        // VALUE STRENGTH (40% weight)
        const valueStrength = valueAnalysis.reduce((sum, v) => {
            return sum + (v.hasValue ? Math.abs(v.valuePercent) * (1 + (v.sharpeRatio || 0)) : 0);
        }, 0) / valueAnalysis.length;
        
        // MARKET EFFICIENCY (25% weight)
        const efficiencyScore = efficiency * 100;
        
        // PREDICTION RELIABILITY (20% weight)
        const predictionReliability = (predictions.team_values?.home_team_value || 50) + (predictions.team_values?.away_team_value || 50) / 2;
        
        // VOLATILITY PENALTY (15% weight)
        const volatilityPenalty = Math.max(0, 100 - volatilityIndex);
        
        const totalConfidence = (
            (valueStrength * 0.4) +
            (efficiencyScore * 0.25) +
            (predictionReliability * 0.2) +
            (volatilityPenalty * 0.15)
        );
        
        return {
            overall: Math.min(100, Math.max(0, totalConfidence)),
            breakdown: {
                valueStrength: valueStrength.toFixed(1),
                marketEfficiency: efficiencyScore.toFixed(1),
                predictionReliability: predictionReliability.toFixed(1),
                volatilityScore: (100 - volatilityIndex).toFixed(1)
            },
            recommendation: totalConfidence > 75 ? 'HIGH CONFIDENCE - EXECUTE' :
                           totalConfidence > 50 ? 'MODERATE - PROCEED WITH CAUTION' :
                           totalConfidence > 25 ? 'LOW CONFIDENCE - SMALL STAKES' :
                           'SKIP THIS MATCH'
        };
    };
    
    // LEGACY CONFIDENCE FOR COMPATIBILITY
    const calculateConfidence = (valueAnalysis, efficiency, predictions) => {
        const volatilityIndex = 50; // Default
        const advanced = calculateAdvancedConfidence(valueAnalysis, efficiency, predictions, volatilityIndex);
        return advanced.overall;
    };
    
    // Display Simple Strategy Function
    const displaySimpleStrategy = (matchId, analysis, match) => {
        console.log('Displaying simple strategy for match:', matchId);
        
        // Create or get the tactics container
        const container = createTacticsContainer(matchId);
        
        // Generate the simple strategy HTML
        const strategyHTML = generateStrategyHTML(analysis, match);
        
        // Display it
        container.innerHTML = strategyHTML;
        container.style.display = 'block';
        
        // CSS pentru noul design simplu și clar
        if (!document.getElementById('simple-tactic-styles')) {
            const styles = document.createElement('style');
            styles.id = 'simple-tactic-styles';
            styles.textContent = `
                .simple-strategy {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    border-radius: 20px;
                    padding: 25px;
                    color: white;
                    margin-top: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                .tactic-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid rgba(255,255,255,0.3);
                }
                
                .tactic-header h2 {
                    margin: 0;
                    font-size: 1.6rem;
                    font-weight: 800;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                
                .confidence-circle {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 1.1rem;
                    color: white;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }
                
                .tactic-explanation {
                    background: rgba(255,255,255,0.15);
                    padding: 20px;
                    border-radius: 15px;
                    margin-bottom: 20px;
                    backdrop-filter: blur(10px);
                }
                
                .tactic-explanation p {
                    margin: 0;
                    font-size: 1.1rem;
                    line-height: 1.6;
                    text-align: center;
                }
                
                .tactic-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 25px;
                }
                
                .info-item {
                    background: rgba(255,255,255,0.2);
                    padding: 15px;
                    border-radius: 12px;
                    text-align: center;
                    backdrop-filter: blur(5px);
                }
                
                .info-icon {
                    font-size: 1.5rem;
                    display: block;
                    margin-bottom: 8px;
                }
                
                .info-text {
                    font-size: 1rem;
                }
                
                .action-steps {
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                }
                
                .action-steps h3 {
                    margin: 0 0 15px 0;
                    font-size: 1.3rem;
                    text-align: center;
                    color: #FFE066;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                }
                
                .steps {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .step {
                    display: flex;
                    align-items: center;
                    background: rgba(255,255,255,0.15);
                    padding: 15px;
                    border-radius: 10px;
                    transition: all 0.3s ease;
                }
                
                .step:hover {
                    background: rgba(255,255,255,0.25);
                    transform: translateX(5px);
                }
                
                .step-number {
                    background: #FFE066;
                    color: #333;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    margin-right: 15px;
                    flex-shrink: 0;
                }
                
                .step-text {
                    font-size: 1rem;
                    line-height: 1.4;
                }
                
                .final-tip {
                    background: rgba(255, 235, 59, 0.2);
                    border: 2px solid #FFE066;
                    padding: 15px;
                    border-radius: 12px;
                    margin-top: 20px;
                    text-align: center;
                    font-size: 1rem;
                }
                
                @media (max-width: 768px) {
                    .simple-strategy {
                        padding: 20px;
                    }
                    
                    .tactic-header {
                        flex-direction: column;
                        gap: 15px;
                        text-align: center;
                    }
                    
                    .tactic-header h2 {
                        font-size: 1.4rem;
                    }
                    
                    .tactic-info {
                        grid-template-columns: 1fr;
                    }
                    
                    .confidence-circle {
                        width: 50px;
                        height: 50px;
                        font-size: 1rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    };
    
    // Create tactics results container
    const createTacticsContainer = (matchId) => {
        // Try to find existing container first
        const existingContainer = document.querySelector(`[data-match-id="${matchId}"]`)?.closest('.match-card')?.querySelector('.tactics-results');
        if (existingContainer) {
            return existingContainer;
        }
        
        // Create new container
        const matchCard = document.querySelector(`[data-match-id="${matchId}"]`)?.closest('.match-card');
        if (!matchCard) {
            console.error('Match card not found for ID:', matchId);
            return null;
        }
        
        const container = document.createElement('div');
        container.className = 'tactics-results';
        container.style.display = 'none';
        matchCard.appendChild(container);
        return container;
    };
    
    // FUNCȚIA ACEASTA A FOST MUTATĂ MAI SUS - șterge acest duplicat
    


    // Simple navigation with index-based approach
    let currentDateIndex = 0; // Index in availableDates array
    
    const navigateDate = async (direction) => {
        console.log(`🧭 Navigate ${direction === 1 ? 'NEXT (newer)' : 'PREV (older)'} - Current index: ${currentDateIndex}`);
        
        if (availableDates.length === 0) {
            console.error('❌ No dates available for navigation');
            return;
        }
        
        let newIndex = currentDateIndex;
        
        if (direction === 1) {
            // Next (newer) - go to lower index (towards 0)
            newIndex = Math.max(0, currentDateIndex - 1);
        } else if (direction === -1) {
            // Previous (older) - go to higher index
            newIndex = Math.min(availableDates.length - 1, currentDateIndex + 1);
        }
        
        console.log(`📍 Navigate from index ${currentDateIndex} to ${newIndex}`);
        
        if (newIndex !== currentDateIndex) {
            currentDateIndex = newIndex;
            const newDateStr = availableDates[currentDateIndex];
            console.log(`✅ Navigating to: ${newDateStr}`);
            
            currentDate = new Date(newDateStr + 'T00:00:00');
            await fetchData(newDateStr);
        } else {
            console.log('🛑 Already at limit, cannot navigate');
        }
    };

    const setupEventListeners = () => {
        // Country selector modal functionality
        countrySelectorBtn.addEventListener('click', openCountryModal);
        closeModalBtn.addEventListener('click', closeCountryModal);
        countryModalOverlay.addEventListener('click', (e) => {
            if (e.target === countryModalOverlay) {
                closeCountryModal();
            }
        });

        // Country search functionality
        countrySearchInput.addEventListener('input', debounce(filterCountries, 200));

        // Confidence selector modal functionality
        confidenceSelectorBtn.addEventListener('click', openConfidenceModal);
        closeConfidenceModalBtn.addEventListener('click', closeConfidenceModal);
        confidenceModalOverlay.addEventListener('click', (e) => {
            if (e.target === confidenceModalOverlay) {
                closeConfidenceModal();
            }
        });

        // Strategy selector modal functionality
        strategySelectorBtn.addEventListener('click', openStrategyModal);
        closeStrategyModalBtn.addEventListener('click', closeStrategyModal);
        strategyModalOverlay.addEventListener('click', (e) => {
            if (e.target === strategyModalOverlay) {
                closeStrategyModal();
            }
        });

        // Sort Time selector modal functionality
        sortTimeSelectorBtn.addEventListener('click', openSortTimeModal);
        closeSortTimeModalBtn.addEventListener('click', closeSortTimeModal);
        sortTimeModalOverlay.addEventListener('click', (e) => {
            if (e.target === sortTimeModalOverlay) {
                closeSortTimeModal();
            }
        });

        // Date navigation
        const prevDateBtn = document.getElementById('prev-date-btn');
        const nextDateBtn = document.getElementById('next-date-btn');
        
        if (prevDateBtn && nextDateBtn) {
            prevDateBtn.addEventListener('click', () => {
                console.log('⬅️ Previous button clicked');
                navigateDate(-1);
            });
            nextDateBtn.addEventListener('click', () => {
                console.log('➡️ Next button clicked');
                navigateDate(1);
            });
            console.log('✅ Date navigation buttons initialized successfully');
        } else {
            console.error('❌ Date navigation buttons not found in DOM');
        }

        // Other filters
        teamSearch.addEventListener('input', debounce(handleFilterChange, 300));
        resetButton.addEventListener('click', resetFilters);
        
        // Hide started toggle
        hideStartedToggle.addEventListener('change', () => {
            currentFilters.hideStarted = hideStartedToggle.checked;
            console.log('🔄 Hide started toggle:', currentFilters.hideStarted);
            renderUI();
        });
        
        // Match cards functionality
        matchesListSection.addEventListener('click', (e) => {
            const summary = e.target.closest('.match-summary');
            if (summary) {
                const card = summary.closest('.match-card');
                // Don't allow clicking on X-BROTHERS matches
                if (card && !card.hasAttribute('data-no-details')) {
                    card.classList.toggle('open');
                }
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (countryModalOverlay.classList.contains('active')) {
                    closeCountryModal();
                }
                if (confidenceModalOverlay.classList.contains('active')) {
                    closeConfidenceModal();
                }
                if (strategyModalOverlay.classList.contains('active')) {
                    closeStrategyModal();
                }
                if (sortTimeModalOverlay.classList.contains('active')) {
                    closeSortTimeModal();
                }
            }
        });

        // Nu mai avem nevoie de scroll functionality
    };

    // --- Competition Colors ---
    // Extract dominant colors from competition flag image
    const extractColorsFromImage = (imgElement) => {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Ensure image is loaded and has dimensions
                if (!imgElement.complete || imgElement.naturalWidth === 0) {
                    resolve('linear-gradient(to bottom, #6366f1, #8b5cf6)');
                    return;
                }
                
                canvas.width = imgElement.naturalWidth;
                canvas.height = imgElement.naturalHeight;
                
                ctx.drawImage(imgElement, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                const colorCounts = {};
                
                // Sample every 4th pixel to get dominant colors
                for (let i = 0; i < data.length; i += 16) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    
                    // Skip only fully transparent pixels
                    if (a > 200) {
                        // Special handling for white and very light colors
                        const isWhiteish = r > 220 && g > 220 && b > 220;
                        const isBlackish = r < 35 && g < 35 && b < 35;
                        
                        // Group similar colors together, but handle white/black specially
                        let rGroup, gGroup, bGroup;
                        
                        if (isWhiteish) {
                            // Keep white colors more precise
                            rGroup = Math.floor(r / 15) * 15;
                            gGroup = Math.floor(g / 15) * 15;
                            bGroup = Math.floor(b / 15) * 15;
                        } else if (isBlackish) {
                            // Keep black colors more precise
                            rGroup = Math.floor(r / 10) * 10;
                            gGroup = Math.floor(g / 10) * 10;
                            bGroup = Math.floor(b / 10) * 10;
                        } else {
                            // Normal grouping for other colors
                            rGroup = Math.floor(r / 30) * 30;
                            gGroup = Math.floor(g / 30) * 30;
                            bGroup = Math.floor(b / 30) * 30;
                        }
                        
                        const color = `${rGroup},${gGroup},${bGroup}`;
                        colorCounts[color] = (colorCounts[color] || 0) + 1;
                    }
                }
                
                // Get top colors with their counts for proportional gradient
                const sortedColorsWithCounts = Object.entries(colorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 4); // Get top 4 colors for more nuanced gradients
                
                if (sortedColorsWithCounts.length >= 2) {
                    const totalPixels = sortedColorsWithCounts.reduce((sum, [, count]) => sum + count, 0);
                    
                    // Calculate raw proportions
                    const colorProportions = sortedColorsWithCounts.map(([color, count]) => ({
                        color: `rgb(${color})`,
                        rawProportion: count / totalPixels,
                        count
                    }));
                    
                    console.log('Raw color proportions:', colorProportions.map(c => ({
                        color: c.color,
                        percentage: (c.rawProportion * 100).toFixed(1) + '%'
                    })));
                    
                    // Detect if colors have similar proportions (flag-like pattern)
                    const significantColors = colorProportions.filter(c => c.rawProportion > 0.15); // At least 15%
                    const isBalancedFlag = significantColors.length >= 2 && significantColors.length <= 4;
                    
                    let adjustedColors;
                    
                    if (isBalancedFlag) {
                        // Check if top colors are relatively similar (within 15% of each other)
                        const maxProp = significantColors[0].rawProportion;
                        const similarColors = significantColors.filter(c => 
                            Math.abs(c.rawProportion - maxProp) / maxProp < 0.4 // Within 40% difference
                        );
                        
                        if (similarColors.length >= 2) {
                            console.log('Detected flag pattern - equalizing colors');
                            // Equal distribution for flag-like patterns
                            adjustedColors = similarColors.map((c, index) => ({
                                ...c,
                                adjustedProportion: 1 / similarColors.length
                            }));
                        } else {
                            // Use raw proportions
                            adjustedColors = significantColors.map(c => ({
                                ...c,
                                adjustedProportion: c.rawProportion
                            }));
                        }
                    } else {
                        // Use raw proportions for non-flag patterns
                        adjustedColors = colorProportions.filter(c => c.rawProportion > 0.1).map(c => ({
                            ...c,
                            adjustedProportion: c.rawProportion
                        }));
                    }
                    
                    // Create simple gradient with smooth transitions
                    const gradientStops = [];
                    
                    if (adjustedColors.length === 1) {
                        // Single color
                        gradientStops.push(`${adjustedColors[0].color} 0%`);
                        gradientStops.push(`${adjustedColors[0].color} 100%`);
                    } else if (adjustedColors.length === 2) {
                        // Two colors with smooth blend
                        gradientStops.push(`${adjustedColors[0].color} 0%`);
                        gradientStops.push(`${adjustedColors[0].color} 35%`);
                        gradientStops.push(`${adjustedColors[1].color} 65%`);
                        gradientStops.push(`${adjustedColors[1].color} 100%`);
                    } else if (adjustedColors.length === 3) {
                        // Three colors (like Bolivia) with equal segments and blends
                        gradientStops.push(`${adjustedColors[0].color} 0%`);
                        gradientStops.push(`${adjustedColors[0].color} 25%`);
                        gradientStops.push(`${adjustedColors[1].color} 40%`);
                        gradientStops.push(`${adjustedColors[1].color} 60%`);
                        gradientStops.push(`${adjustedColors[2].color} 75%`);
                        gradientStops.push(`${adjustedColors[2].color} 100%`);
                    } else {
                        // Four or more colors - simplified approach
                        const step = 100 / adjustedColors.length;
                        adjustedColors.forEach((colorData, index) => {
                            const start = index * step;
                            const end = (index + 1) * step;
                            const blendStart = start + step * 0.2;
                            const blendEnd = end - step * 0.2;
                            
                            if (index === 0) {
                                gradientStops.push(`${colorData.color} ${start}%`);
                                gradientStops.push(`${colorData.color} ${blendEnd}%`);
                            } else if (index === adjustedColors.length - 1) {
                                gradientStops.push(`${colorData.color} ${blendStart}%`);
                                gradientStops.push(`${colorData.color} ${end}%`);
                            } else {
                                gradientStops.push(`${colorData.color} ${blendStart}%`);
                                gradientStops.push(`${colorData.color} ${blendEnd}%`);
                            }
                        });
                    }
                    
                    const gradient = `linear-gradient(to bottom, ${gradientStops.join(', ')})`;
                    console.log('Final gradient:', gradient);
                    resolve(gradient);
                    
                } else if (sortedColorsWithCounts.length === 1) {
                    // Create gradient with lighter version of same color
                    const [color] = sortedColorsWithCounts[0];
                    const [r, g, b] = color.split(',').map(Number);
                    const baseColor = `rgb(${color})`;
                    const lighter = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
                    resolve(`linear-gradient(to bottom, ${baseColor} 0%, ${lighter} 100%)`);
                } else {
                    resolve('linear-gradient(to bottom, #6366f1, #8b5cf6)');
                }
            } catch (error) {
                console.error('Color extraction failed:', error);
                resolve('linear-gradient(to bottom, #6366f1, #8b5cf6)');
            }
        });
    };
    
    // Apply competition colors extracted from flag images
    const applyCompetitionColors = () => {
        const competitionHeaders = document.querySelectorAll('.competition-group-header');
        console.log('Found competition headers:', competitionHeaders.length);
        
        competitionHeaders.forEach(async (header, index) => {
            const img = header.querySelector('img');
            const competitionName = header.querySelector('h3')?.textContent || '';
            
            console.log(`Processing header ${index}: "${competitionName}"`);
            
            let gradient = 'linear-gradient(to bottom, #6366f1, #8b5cf6)'; // Default
            
            if (img && img.complete && img.naturalWidth > 0) {
                // Image is already loaded
                gradient = await extractColorsFromImage(img);
            } else if (img && img.src) {
                // Wait for image to load
                try {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Image load timeout')), 3000);
                        img.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        img.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error('Image load error'));
                        };
                        // If image is already loaded but we missed it
                        if (img.complete) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });
                    gradient = await extractColorsFromImage(img);
                } catch (error) {
                    console.log(`Image load failed for ${competitionName}:`, error.message);
                }
            }
            
            console.log(`Header ${index}: "${competitionName}" -> ${gradient}`);
            
            // Apply the gradient
            header.style.borderLeft = 'none';
            header.style.position = 'relative';
            
            // Create unique CSS rule for this specific header
            const styleId = `competition-style-${index}`;
            let existingStyle = document.getElementById(styleId);
            
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .competition-group:nth-child(${index + 1}) .competition-group-header::before {
                    content: '';
                    position: absolute;
                    left: -1px;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: ${gradient};
                    border-radius: 0 2px 2px 0;
                    z-index: 1;
                }
            `;
            
            document.head.appendChild(style);
        });
    };
    
    // --- Rendering & UI ---
    const renderUI = () => {
        const filteredCompetitions = filterData();
        
        if (filteredCompetitions.length === 0) {
            matchesListSection.innerHTML = ''; // Clear previous content
            noResultsElement.style.display = 'block';
        } else {
            noResultsElement.style.display = 'none';
            
            // Check if X-BROTHERS strategy is selected
            if (currentFilters.strategy === 'x-brothers') {
                // Render simple list for X-BROTHERS
                matchesListSection.innerHTML = createXBrothersListHTML(filteredCompetitions);
                // Setup controls after rendering
                setTimeout(() => {
                    setupXBrothersControls();
                }, 100);
            } else {
                // Check if time sorting is enabled
                if (currentFilters.sortTime === 'time-asc') {
                    // Sort all matches by time across all competitions
                    const allMatches = filteredCompetitions.flatMap(comp => 
                        comp.matches.map(match => ({ ...match, competition: comp }))
                    );
                    
                    // Sort by time
                    allMatches.sort((a, b) => {
                        const timeA = a.time || '99:99';
                        const timeB = b.time || '99:99';
                        return timeA.localeCompare(timeB);
                    });
                    
                    // Render as a single list without competition groups
                    matchesListSection.innerHTML = createTimeSortedListHTML(allMatches);
                    // Apply competition colors for time-sorted view
                    applyCompetitionColors();
                } else {
                    // Render normal view with competitions
                    matchesListSection.innerHTML = filteredCompetitions.map(createCompetitionGroupHTML).join('');
                    // Apply competition colors IMMEDIATELY after rendering
                    applyCompetitionColors();
                }
            }
        }
        
        updateStats(filteredCompetitions);
    };

    // Create time-sorted list of matches without competition groups
    const createTimeSortedListHTML = (sortedMatches) => {
        if (sortedMatches.length === 0) {
            return '<p class="no-data">No matches found</p>';
        }
        
        return `
            <div class="time-sorted-header">
                <h2><i class="fas fa-clock"></i> Matches Sorted by Time</h2>
                <p>All matches ordered by kick-off time</p>
            </div>
            <div class="time-sorted-matches">
                ${sortedMatches.map(match => createTimeSortedMatchHTML(match)).join('')}
            </div>
        `;
    };

    // Create individual match HTML for time-sorted view - using competition-group structure
    const createTimeSortedMatchHTML = (match) => {
        // Get competition info for display
        const competition = match.competition;
        const flagPath = competition.flag_icon_local || '';
        
        return `
            <div class="competition-group">
                <div class="competition-group-header">
                    <img src="${flagPath}" alt="${competition.name}" onerror="this.style.display='none'" ${flagPath ? '' : 'style="display:none;"'}>
                    <h3>${competition.country} - ${competition.name}</h3>
                </div>
                ${createMatchCardHTML(match)}
            </div>
        `;
    };

    // Create simple list for X-BROTHERS strategy - NO competitions, NO details
    const createXBrothersListHTML = (competitions) => {
        // Flatten all matches from all competitions
        const allMatches = competitions.flatMap(comp => comp.matches);
        
        if (allMatches.length === 0) {
            return '<p class="no-data">No X-BROTHERS matches found</p>';
        }
        
        // Group matches in pairs where odds multiplied > 10
        const matchPairs = createMatchPairs(allMatches);
        
        // Store pairs for shuffling and controls
        originalXBrothersPairs = [...matchPairs];
        currentXBrothersPairs = [...matchPairs];
        
        return `
            <div class="x-brothers-header">
                <h2>🎯 X-BROTHERS Strategy</h2>
                <p>Strategic betting system using combined draw odds for profit optimization</p>
                
                <div class="strategy-explanation">
                    <div class="strategy-summary">
                        <p><strong>Risk Management:</strong> Diversify across ${matchPairs.length} combinations with ~10.0+ odds</p>
                        <button class="read-more-btn" onclick="toggleStrategyDetails()">
                            <span class="read-more-text">Read More</span>
                            <i class="fas fa-chevron-down read-more-icon"></i>
                        </button>
                    </div>
                    
                    <div class="strategy-details" id="strategy-details" style="display: none;">
                        <div class="strategy-content">
                            <h4>📊 Strategy Overview</h4>
                            <p>The X-BROTHERS system utilizes mathematical probability distribution across multiple double-draw combinations. By selecting pairs with X odds between 3.00-4.00, we achieve optimal risk-reward ratios.</p>
                            
                            <h4>💰 Profit Calculation</h4>
                            <ul>
                                <li><strong>Investment:</strong> 10 tickets × $10 each = $100 total</li>
                                <li><strong>Break-even:</strong> Just 1 winning ticket recovers investment</li>
                                <li><strong>Profit:</strong> 2+ winning tickets generate positive returns</li>
                                <li><strong>Risk:</strong> Distributed across multiple independent events</li>
                            </ul>
                            
                            <h4>🎯 Why It Works</h4>
                            <p>Draw outcomes in football occur approximately 25-30% of the time. By combining two matches with 3.00-4.00 X odds, we create scenarios where even low success rates can yield consistent profits through volume and diversification.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="x-brothers-controls-top">
                <div class="controls-left">
                    ${matchPairs.length > 1 ? `
                    <div class="pairs-limit-control">
                        <label for="pairs-limit-slider">Display Pairs: <span id="pairs-count-display">${Math.min(10, matchPairs.length)}</span></label>
                        <div class="slider-with-buttons">
                            <button class="pairs-btn minus-btn" onclick="decreasePairs()" title="Decrease pairs">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="range" id="pairs-limit-slider" min="1" max="${matchPairs.length}" value="${Math.min(10, matchPairs.length)}" class="pairs-slider">
                            <button class="pairs-btn plus-btn" onclick="increasePairs()" title="Increase pairs">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="controls-right">
                    <button class="shuffle-btn" onclick="shuffleXBrothersPairs(event)">
                        <i class="fas fa-random"></i>
                        Shuffle
                    </button>
                </div>
            </div>
            
            <div class="x-brothers-pairs-list" id="x-brothers-pairs-container">
                ${matchPairs.slice(0, Math.min(10, matchPairs.length)).map(createMatchPairHTML).join('')}
            </div>
        `;
    };

    // Create pairs of matches where odds multiplied > 10
    const createMatchPairs = (matches) => {
        const pairs = [];
        const usedMatches = new Set();
        
        // Shuffle matches for random pairing
        const shuffledMatches = [...matches].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < shuffledMatches.length - 1; i++) {
            if (usedMatches.has(shuffledMatches[i].id)) continue;
            
            const match1 = shuffledMatches[i];
            const odds1 = Array.isArray(match1.odds) ? parseFloat(match1.odds[1]) : 0;
            
            for (let j = i + 1; j < shuffledMatches.length; j++) {
                if (usedMatches.has(shuffledMatches[j].id)) continue;
                
                const match2 = shuffledMatches[j];
                const odds2 = Array.isArray(match2.odds) ? parseFloat(match2.odds[1]) : 0;
                
                // Check if odds multiplied > 10
                if (odds1 * odds2 > 10) {
                    pairs.push({
                        match1: match1,
                        match2: match2,
                        combinedOdds: odds1 * odds2,
                        odds1: odds1,
                        odds2: odds2
                    });
                    
                    usedMatches.add(match1.id);
                    usedMatches.add(match2.id);
                    break;
                }
            }
        }
        
        return pairs;
    };

    // Create pair card HTML with same style as normal matches - one match below the other
    const createMatchPairHTML = (pair) => {
        const { match1, match2, combinedOdds, odds1, odds2 } = pair;
        
        // Calculate confidences for both matches
        const confidences1 = calculateConfidences(match1);
        const confidences2 = calculateConfidences(match2);
        const confidenceClass1 = getConfidenceClass(confidences1.overall);
        const confidenceClass2 = getConfidenceClass(confidences2.overall);
        
        return `
            <div class="match-card x-brothers-pair" data-no-details="true">
                <div class="pair-combined-odds">
                    <span class="combined-odds-text">Combined Odds: ${combinedOdds.toFixed(2)}</span>
                </div>
                
                <!-- First Match -->
                <div class="match-summary">
                    <div class="team-display home">
                        <img src="${match1.home_team_logo_local || ''}" class="team-logo" alt="${match1.home_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                        <span class="team-name">${match1.home_team}</span>
                    </div>
                    <div class="match-center-info x-brothers-center">
                        <div class="x-odds-display">X: ${odds1}</div>
                        <div class="match-time">${match1.time || 'TBD'}</div>
                        <div class="confidence-pill ${confidenceClass1}">${confidences1.overall}%</div>
                    </div>
                    <div class="team-display away">
                        <span class="team-name">${match1.away_team}</span>
                        <img src="${match1.away_team_logo_local || ''}" class="team-logo" alt="${match1.away_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                    </div>
                </div>
                
                <!-- Second Match -->
                <div class="match-summary">
                    <div class="team-display home">
                        <img src="${match2.home_team_logo_local || ''}" class="team-logo" alt="${match2.home_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                        <span class="team-name">${match2.home_team}</span>
                    </div>
                    <div class="match-center-info x-brothers-center">
                        <div class="x-odds-display">X: ${odds2}</div>
                        <div class="match-time">${match2.time || 'TBD'}</div>
                        <div class="confidence-pill ${confidenceClass2}">${confidences2.overall}%</div>
                    </div>
                    <div class="team-display away">
                        <span class="team-name">${match2.away_team}</span>
                        <img src="${match2.away_team_logo_local || ''}" class="team-logo" alt="${match2.away_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                    </div>
                </div>
            </div>
        `;
    };

    // Create simple match card for X-BROTHERS (NO click, NO details, NO competitions)
    const createSimpleMatchHTML = (match) => {
        const confidences = calculateConfidences(match);
        const confidenceClass = getConfidenceClass(confidences.overall);
        const homeLogo = match.home_team_logo_local ? `${match.home_team_logo_local}` : '';
        const awayLogo = match.away_team_logo_local ? `${match.away_team_logo_local}` : '';
        const xOdds = Array.isArray(match.odds) ? match.odds[1] : 'N/A';
        
        return `
            <div class="match-card x-brothers-match" data-no-details="true">
                <div class="match-summary">
                    <div class="team-display home">
                        <img src="${homeLogo}" class="team-logo" alt="${match.home_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                        <span class="team-name">${match.home_team}</span>
                    </div>
                    <div class="match-center-info">
                        <div class="match-time">${match.time || 'TBD'}</div>
                        <div class="confidence-pill ${confidenceClass}">${confidences.overall}%</div>
                        <div class="x-odds-display">X: ${xOdds}</div>
                    </div>
                    <div class="team-display away">
                        <span class="team-name">${match.away_team}</span>
                        <img src="${awayLogo}" class="team-logo" alt="${match.away_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                    </div>
                </div>
            </div>
        `;
    };

    const createCompetitionGroupHTML = (competition) => {
        const flagPath = competition.flag_icon_local ? `${competition.flag_icon_local}` : '';
        return `
            <div class="competition-group">
                <div class="competition-group-header">
                     <img src="${flagPath}" alt="${competition.name}" onerror="this.style.display='none'" ${flagPath ? '' : 'style="display:none;"'}>
                     <h3>${competition.country} - ${competition.name}</h3>
                </div>
                ${competition.matches.map(createMatchCardHTML).join('')}
            </div>
        `;
    };

    const createMatchCardHTML = (match) => {
        const confidences = calculateConfidences(match);
        const confidenceClass = getConfidenceClass(confidences.overall);
        const homeLogo = match.home_team_logo_local ? `${match.home_team_logo_local}` : '';
        const awayLogo = match.away_team_logo_local ? `${match.away_team_logo_local}` : '';

        // Check if current date is "Today" - if not, open matches by default
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();
        const openClass = isToday ? '' : ' open';

        // Extract final score if available (only for non-Today matches)
        const finalScore = match['full-score'] || match.full_score || '';
        const [homeScore, awayScore] = finalScore ? finalScore.split('-').map(s => s.trim()) : ['', ''];
        
        // Extract halftime score
        const halftimeScore = match['first-half-score'] || match.first_half_score || '';
        const [homeHalftimeScore, awayHalftimeScore] = halftimeScore ? halftimeScore.split('-').map(s => s.trim()) : ['', ''];
        
        const hasScore = !isToday && homeScore !== '' && awayScore !== '';
        const hasHalftimeScore = halftimeScore && homeHalftimeScore !== '' && awayHalftimeScore !== '';

        return `
            <div class="match-card${openClass}" data-match-id="${match.id || match.match_id}">
                <div class="match-summary">
                    <div class="team-display home">
                        <img src="${homeLogo}" class="team-logo" alt="${match.home_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                        <div class="team-info">
                            <span class="team-name">${match.home_team}</span>
                            ${hasScore ? `<span class="team-score">${homeScore}${hasHalftimeScore ? ` <span class="halftime-score">(${homeHalftimeScore})</span>` : ''}</span>` : ''}
                        </div>
                    </div>
                    <div class="match-center-info">
                        <div class="match-time">${match.time || 'TBD'}</div>
                        <div class="confidence-pill ${confidenceClass}">${confidences.overall}%</div>
                    </div>
                    <div class="team-display away">
                        <div class="team-info">
                            <span class="team-name">${match.away_team}</span>
                            ${hasScore ? `<span class="team-score">${awayScore}${hasHalftimeScore ? ` <span class="halftime-score">(${awayHalftimeScore})</span>` : ''}</span>` : ''}
                        </div>
                        <img src="${awayLogo}" class="team-logo" alt="${match.away_team}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
                    </div>
                </div>
                <div class="match-details-wrapper">
                    ${createMatchDetailsHTML(match, confidences)}
                </div>
            </div>
        `;
    };

    const createMatchDetailsHTML = (match, confidences) => {
        const p = match.predictions || {};
        const oddsData = Array.isArray(match.odds) ? { '1': match.odds[0], 'X': match.odds[1], '2': match.odds[2] } : match.odds || {};

        return `
            <div class="match-details-grid">
                <!-- Top Scores -->
                <div class="details-card">
                    <h4 class="details-card-header"><i class="fas fa-bullseye"></i> Top Scores</h4>
                    <div class="scores-list">
                        ${(p.top_3_correct_scores || []).slice(0, 3).map((s, index) => {
                            // Check if current date is "Today"
                            const today = new Date();
                            const isToday = currentDate.toDateString() === today.toDateString();
                            
                            if (isToday) {
                                // OLD SYSTEM: Use highest probability logic
                                const isHighest = index === 0; // First item has highest percentage
                                return `
                                    <div class="score-item ${isHighest ? 'highest-probability' : ''}">
                                        ${isHighest ? '<div class="fire-emoji">🔥</div>' : ''}
                                        <div class="score-value">${s.score}</div>
                                        <div class="score-percentage">${createProbabilityBadge(s.percentage)}</div>
                                    </div>
                                `;
                            } else {
                                // NEW SYSTEM: Use status-based logic only for recommended predictions
                                if (index === 0) {
                                    // First score (recommended) - show status
                                    const status = s.status;
                                    const statusClass = status === true ? 'status-correct' : status === false ? 'status-incorrect' : '';
                                    const statusEmoji = status === true ? '✅' : status === false ? '❌' : '';
                                    
                                    return `
                                        <div class="score-item ${statusClass}">
                                            ${statusEmoji ? `<div class="status-emoji">${statusEmoji}</div>` : ''}
                                            <div class="score-value">${s.score}</div>
                                            <div class="score-percentage">${createProbabilityBadge(s.percentage)}</div>
                                        </div>
                                    `;
                                } else {
                                    // Other scores (not recommended) - show disabled style
                                    return `
                                        <div class="score-item disabled-prediction">
                                            <div class="score-value">${s.score}</div>
                                            <div class="score-percentage">${createProbabilityBadge(s.percentage)}</div>
                                        </div>
                                    `;
                                }
                            }
                        }).join('') || '<p class="no-data">N/A</p>'}
                    </div>
                    ${p.most_likely_halftime_score ? `
                        <div class="halftime-score-section">
                            <h4 class="details-card-header"><i class="fas fa-clock"></i> Halftime Score</h4>
                            <div class="halftime-score-item ${(() => {
                                const today = new Date();
                                const isToday = currentDate.toDateString() === today.toDateString();
                                if (isToday) {
                                    // OLD SYSTEM: Add class if percentage > 50%
                                    return parseFloat(p.most_likely_halftime_score.percentage) > 50 ? 'highest-halftime' : '';
                                } else {
                                    // NEW SYSTEM: Show status only if recommended (percentage > 50%)
                                    if (parseFloat(p.most_likely_halftime_score.percentage) > 50) {
                                        return p.most_likely_halftime_score.status === true ? 'status-correct' : p.most_likely_halftime_score.status === false ? 'status-incorrect' : '';
                                    } else {
                                        return 'disabled-prediction';
                                    }
                                }
                            })()}">
                                ${(() => {
                                    const today = new Date();
                                    const isToday = currentDate.toDateString() === today.toDateString();
                                    if (isToday) {
                                        // OLD SYSTEM: Add emoji if percentage > 50%
                                        return parseFloat(p.most_likely_halftime_score.percentage) > 50 ? '<div class="halftime-emoji">⏰</div>' : '';
                                    } else {
                                        // NEW SYSTEM: Show emoji only if recommended (percentage > 50%)
                                        if (parseFloat(p.most_likely_halftime_score.percentage) > 50) {
                                            return p.most_likely_halftime_score.status === true ? '<div class="status-emoji">✅</div>' : p.most_likely_halftime_score.status === false ? '<div class="status-emoji">❌</div>' : '';
                                        } else {
                                            return '';
                                        }
                                    }
                                })()}
                                <div class="score-value">HT: ${p.most_likely_halftime_score.score}</div>
                                <div class="score-percentage">${createProbabilityBadge(p.most_likely_halftime_score.percentage)}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Goals Markets -->
                <div class="details-card">
                    <h4 class="details-card-header"><i class="fas fa-futbol"></i> Goal Markets</h4>
                    <div class="market-list">
                        ${(() => {
                            const goalsMarkets = Object.entries(p.goals_markets || {})
                                .filter(([key, value]) => !key.endsWith('_status')); // Exclude status fields
                            if (goalsMarkets.length === 0) return '<p class="no-data">N/A</p>';
                            
                            // Check if current date is "Today"
                            const today = new Date();
                            const isToday = currentDate.toDateString() === today.toDateString();
                            
                            if (isToday) {
                                // OLD SYSTEM: Use highest probability logic
                                const maxValue = Math.max(...goalsMarkets.map(([key, value]) => parseFloat(value) || 0));
                                
                                return goalsMarkets.map(([key, value]) => {
                                    const isHighest = parseFloat(value) === maxValue && maxValue > 0;
                                    return `
                                        <div class="market-item ${isHighest ? 'highest-market' : ''}">
                                            ${isHighest ? '<div class="thumbs-emoji">👍</div>' : ''}
                                            <span class="market-name">${formatMarketName(key)}</span>
                                            <span class="market-value">${createProbabilityBadge(value)}</span>
                                        </div>
                                    `;
                                }).join('');
                            } else {
                                // NEW SYSTEM: Show status only for recommended (highest probability)
                                const maxValue = Math.max(...goalsMarkets.map(([key, value]) => parseFloat(value) || 0));
                                
                                return goalsMarkets.map(([key, value]) => {
                                    const isRecommended = parseFloat(value) === maxValue && maxValue > 0;
                                    
                                    if (isRecommended) {
                                        // Recommended market - show status
                                        const statusKey = key + '_status';
                                        const status = p.goals_markets?.[statusKey];
                                        const statusClass = status === true ? 'status-correct' : status === false ? 'status-incorrect' : '';
                                        const statusEmoji = status === true ? '✅' : status === false ? '❌' : '';
                                        
                                        return `
                                            <div class="market-item ${statusClass}">
                                                ${statusEmoji ? `<div class="status-emoji">${statusEmoji}</div>` : ''}
                                                <span class="market-name">${formatMarketName(key)}</span>
                                                <span class="market-value">${createProbabilityBadge(value)}</span>
                                            </div>
                                        `;
                                    } else {
                                        // Not recommended - show disabled style
                                        return `
                                            <div class="market-item disabled-prediction">
                                                <span class="market-name">${formatMarketName(key)}</span>
                                                <span class="market-value">${createProbabilityBadge(value)}</span>
                                            </div>
                                        `;
                                    }
                                }).join('');
                            }
                        })()}
                    </div>
                </div>

                <!-- Team Markets -->
                <div class="details-card">
                    <h4 class="details-card-header"><i class="fas fa-users"></i> Team Markets</h4>
                    <div class="market-list">
                        ${(() => {
                            const teamsMarkets = Object.entries(p.teams_markets || {})
                                .filter(([key, value]) => !key.endsWith('_status')); // Exclude status fields
                            if (teamsMarkets.length === 0) return '<p class="no-data">N/A</p>';
                            
                            // Check if current date is "Today"
                            const today = new Date();
                            const isToday = currentDate.toDateString() === today.toDateString();
                            
                            if (isToday) {
                                // OLD SYSTEM: Use highest probability logic
                                const validMarkets = teamsMarkets.filter(([key, value]) => parseFloat(value) > 50);
                                const maxValue = validMarkets.length > 0 ? Math.max(...validMarkets.map(([key, value]) => parseFloat(value))) : 0;
                                
                                return teamsMarkets.map(([key, value]) => {
                                    const isHighest = parseFloat(value) === maxValue && maxValue > 50;
                                    return `
                                        <div class="market-item ${isHighest ? 'highest-team-market' : ''}">
                                            ${isHighest ? '<div class="target-emoji">🎯</div>' : ''}
                                            <span class="market-name">${formatMarketName(key)}</span>
                                            <span class="market-value">${createProbabilityBadge(value)}</span>
                                        </div>
                                    `;
                                }).join('');
                            } else {
                                // NEW SYSTEM: Show status only for recommended (>50% probability)
                                const validMarkets = teamsMarkets.filter(([key, value]) => parseFloat(value) > 50);
                                const maxValue = validMarkets.length > 0 ? Math.max(...validMarkets.map(([key, value]) => parseFloat(value))) : 0;
                                
                                return teamsMarkets.map(([key, value]) => {
                                    const isRecommended = parseFloat(value) === maxValue && maxValue > 50;
                                    
                                    if (isRecommended) {
                                        // Recommended market - show status
                                        const statusKey = key + '_status';
                                        const status = p.teams_markets?.[statusKey];
                                        const statusClass = status === true ? 'status-correct' : status === false ? 'status-incorrect' : '';
                                        const statusEmoji = status === true ? '✅' : status === false ? '❌' : '';
                                        
                                        return `
                                            <div class="market-item ${statusClass}">
                                                ${statusEmoji ? `<div class="status-emoji">${statusEmoji}</div>` : ''}
                                                <span class="market-name">${formatMarketName(key)}</span>
                                                <span class="market-value">${createProbabilityBadge(value)}</span>
                                            </div>
                                        `;
                                    } else {
                                        // Not recommended - show disabled style
                                        return `
                                            <div class="market-item disabled-prediction">
                                                <span class="market-name">${formatMarketName(key)}</span>
                                                <span class="market-value">${createProbabilityBadge(value)}</span>
                                            </div>
                                        `;
                                    }
                                }).join('');
                            }
                        })()}
                    </div>
                </div>

                <!-- Odds -->
                <div class="details-card">
                    <h4 class="details-card-header"><i class="fas fa-chart-line"></i> Bookmaker Odds</h4>
                    <div class="odds-list">
                        ${(() => {
                            if (Object.keys(oddsData).length === 0) return '<p class="no-data">N/A</p>';
                            
                                                         // Determine the most likely result from ALL top scores
                             let predictedOutcome = null;
                             if (p.top_3_correct_scores && p.top_3_correct_scores.length > 0) {
                                 let homeWins = 0;
                                 let draws = 0;
                                 let awayWins = 0;
                                 
                                 // Analyze all top 3 scores
                                 p.top_3_correct_scores.forEach(scoreData => {
                                     const [homeGoals, awayGoals] = scoreData.score.split('-').map(Number);
                                     
                                     if (homeGoals > awayGoals) {
                                         homeWins++;
                                     } else if (homeGoals < awayGoals) {
                                         awayWins++;
                                     } else {
                                         draws++;
                                     }
                                 });
                                 
                                 // Determine outcome based on majority
                                 if (homeWins > draws && homeWins > awayWins) {
                                     predictedOutcome = '1'; // Home win
                                 } else if (awayWins > draws && awayWins > homeWins) {
                                     predictedOutcome = '2'; // Away win
                                 } else if (draws > homeWins && draws > awayWins) {
                                     predictedOutcome = 'X'; // Draw
                                 } else {
                                     // If there's a tie in majority, use the first score (highest percentage)
                                     const firstScore = p.top_3_correct_scores[0];
                                     if (firstScore) {
                                         const [homeGoals, awayGoals] = firstScore.score.split('-').map(Number);
                                         if (homeGoals > awayGoals) {
                                             predictedOutcome = '1'; // Home win
                                         } else if (homeGoals < awayGoals) {
                                             predictedOutcome = '2'; // Away win
                                         } else {
                                             predictedOutcome = 'X'; // Draw
                                         }
                                     }
                                 }
                             }
                            
                            // Definește ordinea dorită: 1 X 2
                            const oddsOrder = ['1', 'X', '2'];
                            const orderedOdds = [];
                            
                            // Adaugă odds-urile în ordinea dorită
                            oddsOrder.forEach(key => {
                                if (oddsData[key] !== undefined) {
                                    orderedOdds.push([key, oddsData[key]]);
                                }
                            });
                            
                            // Adaugă orice alte odds-uri care nu sunt în lista principală
                            Object.entries(oddsData).forEach(([key, value]) => {
                                if (!oddsOrder.includes(key)) {
                                    orderedOdds.push([key, value]);
                                }
                            });
                            
                            return orderedOdds.map(([key, value]) => {
                                // Check if current date is "Today"
                                const today = new Date();
                                const isToday = currentDate.toDateString() === today.toDateString();
                                
                                if (isToday) {
                                    // OLD SYSTEM: Use predicted outcome logic
                                    const isBestOdds = key === predictedOutcome;
                                    return `
                                        <div class="odds-item ${isBestOdds ? 'best-odds' : ''}">
                                            ${isBestOdds ? '<div class="crown-emoji">👑</div>' : ''}
                                            <div class="odds-label">${formatMarketName(key)}</div>
                                            <div class="odds-value">${value}</div>
                                        </div>
                                    `;
                                } else {
                                    // NEW SYSTEM: Show status only for recommended (predicted outcome)
                                    const isRecommended = key === predictedOutcome;
                                    
                                    if (isRecommended) {
                                        // Recommended outcome - show status
                                        let status = null;
                                        let statusKey = '';
                                        if (key === '1') {
                                            statusKey = 'home_win_status';
                                            status = p.market_analysis?.[statusKey];
                                        } else if (key === 'X') {
                                            statusKey = 'draw_status';
                                            status = p.market_analysis?.[statusKey];
                                        } else if (key === '2') {
                                            statusKey = 'away_win_status';
                                            status = p.market_analysis?.[statusKey];
                                        }
                                        
                                        const statusClass = status === true ? 'status-correct' : status === false ? 'status-incorrect' : '';
                                        const statusEmoji = status === true ? '✅' : status === false ? '❌' : '';
                                        
                                        return `
                                            <div class="odds-item ${statusClass}">
                                                ${statusEmoji ? `<div class="status-emoji">${statusEmoji}</div>` : ''}
                                                <div class="odds-label">${formatMarketName(key)}</div>
                                                <div class="odds-value">${value}</div>
                                            </div>
                                        `;
                                    } else {
                                        // Not recommended - show disabled style
                                        return `
                                            <div class="odds-item disabled-prediction">
                                                <div class="odds-label">${formatMarketName(key)}</div>
                                                <div class="odds-value">${value}</div>
                                            </div>
                                        `;
                                    }
                                }
                            }).join('');
                        })()}
                    </div>
                </div>
                

            </div>
        `;
    };

    // --- Data & Filtering ---
    const filterData = () => {
        currentFilters.search = teamSearch.value.toLowerCase();
        
        // Debug logging for Hide Started filter
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();
        if (isToday && currentFilters.hideStarted) {
            console.log('🔍 Hide Started filter is ACTIVE for Today');
        }
        
        return allMatchesData.map(competition => {
            const filteredMatches = competition.matches.filter(match => {
                const confidence = calculateConfidences(match).overall;
                
                const countryMatch = currentFilters.competition ? competition.country === currentFilters.competition : true;
                const confidenceMatch = currentFilters.confidence ? 
                    matchesConfidenceFilter(confidence, currentFilters.confidence) : true;
                const searchMatch = currentFilters.search ? 
                    match.home_team.toLowerCase().includes(currentFilters.search) || 
                    match.away_team.toLowerCase().includes(currentFilters.search) : true;
                const strategyMatch = currentFilters.strategy ? 
                    matchesStrategyFilter(match, currentFilters.strategy) : true;
                const statCategoryMatch = currentStatFilter ? 
                    matchesStatCategoryFilter(match, currentStatFilter) : true;
                
                // Check if current date is "Today" - hideStarted filter applies only to Today
                const today = new Date();
                const isToday = currentDate.toDateString() === today.toDateString();
                const hideStartedMatch = (currentFilters.hideStarted && isToday) ? 
                    !hasMatchStarted(match) : true;

                return countryMatch && confidenceMatch && searchMatch && strategyMatch && statCategoryMatch && hideStartedMatch;
            });

            return { ...competition, matches: filteredMatches };
        }).filter(competition => competition.matches.length > 0);
    };

    const matchesStatCategoryFilter = (match, category) => {
        const p = match.predictions || {};
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();
        
        // Only apply stat filter for non-Today dates
        if (isToday) return true;
        
        switch (category) {
            case 'topScores':
                // Check if first top score has correct status
                if (p.top_3_correct_scores?.length > 0) {
                    const firstScore = p.top_3_correct_scores[0];
                    return firstScore.status === true;
                }
                return false;
                
            case 'halftime':
                // Check if halftime score is recommended (>50%) and correct
                if (p.most_likely_halftime_score?.status !== undefined && 
                    parseFloat(p.most_likely_halftime_score.percentage) > 50) {
                    return p.most_likely_halftime_score.status === true;
                }
                return false;
                
            case 'goalsMarkets':
                // Check if highest goals market prediction is correct
                if (p.goals_markets) {
                    const goalsMarkets = Object.entries(p.goals_markets)
                        .filter(([key, value]) => !key.endsWith('_status'));
                    
                    if (goalsMarkets.length > 0) {
                        const maxValue = Math.max(...goalsMarkets.map(([key, value]) => parseFloat(value) || 0));
                        const highestMarket = goalsMarkets.find(([key, value]) => parseFloat(value) === maxValue && maxValue > 0);
                        
                        if (highestMarket) {
                            const [marketKey] = highestMarket;
                            const statusKey = `${marketKey}_status`;
                            return p.goals_markets[statusKey] === true;
                        }
                    }
                }
                return false;
                
            case 'teamsMarkets':
                // Check if highest teams market prediction (>50%) is correct
                if (p.teams_markets) {
                    const teamsMarkets = Object.entries(p.teams_markets)
                        .filter(([key, value]) => !key.endsWith('_status'));
                    
                    const validMarkets = teamsMarkets.filter(([key, value]) => parseFloat(value) > 50);
                    
                    if (validMarkets.length > 0) {
                        const maxValue = Math.max(...validMarkets.map(([key, value]) => parseFloat(value)));
                        const highestTeamMarket = validMarkets.find(([key, value]) => parseFloat(value) === maxValue);
                        
                        if (highestTeamMarket) {
                            const [marketKey] = highestTeamMarket;
                            const statusKey = `${marketKey}_status`;
                            return p.teams_markets[statusKey] === true;
                        }
                    }
                }
                return false;
                
            case 'bookmakerOdds':
                // Check if predicted outcome from top scores is correct
                if (p.top_3_correct_scores?.length > 0 && match.odds) {
                    let homeWins = 0, draws = 0, awayWins = 0;
                    
                    p.top_3_correct_scores.forEach(scoreData => {
                        const [homeGoals, awayGoals] = scoreData.score.split('-').map(Number);
                        if (homeGoals > awayGoals) homeWins++;
                        else if (homeGoals < awayGoals) awayWins++;
                        else draws++;
                    });
                    
                    let predictedOutcome = null;
                    if (homeWins > draws && homeWins > awayWins) predictedOutcome = '1';
                    else if (awayWins > draws && awayWins > homeWins) predictedOutcome = '2';
                    else if (draws > homeWins && draws > awayWins) predictedOutcome = 'X';
                    
                    if (predictedOutcome && p.market_analysis) {
                        let statusKey = '';
                        if (predictedOutcome === '1') statusKey = 'home_win_status';
                        else if (predictedOutcome === 'X') statusKey = 'draw_status';
                        else if (predictedOutcome === '2') statusKey = 'away_win_status';
                        
                        return p.market_analysis[statusKey] === true;
                    }
                }
                return false;
                
            default:
                return true;
        }
    };

    // --- Modal Functions ---
    const openCountryModal = () => {
        countryModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        countrySearchInput.focus();
    };

    const closeCountryModal = () => {
        countryModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        countrySearchInput.value = '';
        filterCountries(); // Reset search
    };

    const openConfidenceModal = () => {
        confidenceModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeConfidenceModal = () => {
        confidenceModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    const openStrategyModal = () => {
        strategyModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeStrategyModal = () => {
        strategyModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    const openSortTimeModal = () => {
        sortTimeModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeSortTimeModal = () => {
        sortTimeModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    const populateFilters = () => {
        // Creez un mapping pentru steagurile țărilor din JSON
        const countryFlags = {};
        allMatchesData.forEach(competition => {
            if (!countryFlags[competition.country] && competition.flag_icon_local) {
                countryFlags[competition.country] = competition.flag_icon_local;
            }
        });

        const countries = [...new Set(allMatchesData.map(c => c.country))].sort();
        
        // Clear and populate country list
        countryList.innerHTML = '';
        
        // Add "All Countries" option
        const allOption = document.createElement('div');
        allOption.className = 'country-option';
        allOption.setAttribute('data-value', '');
        allOption.innerHTML = '<span>All Countries</span>';
        allOption.addEventListener('click', function() {
            selectCountry('', 'All Countries');
        });
        countryList.appendChild(allOption);
        
        // Add country options with flags
        countries.forEach(country => {
            const option = document.createElement('div');
            option.className = 'country-option';
            option.setAttribute('data-value', country);
            option.setAttribute('data-search', country.toLowerCase());
            
            const flagPath = countryFlags[country];
            const flagImg = flagPath ? `<img src="${flagPath}" class="country-flag" alt="${country}" onerror="this.style.display='none'">` : '';
            option.innerHTML = `${flagImg}<span>${country}</span>`;
            
            option.addEventListener('click', function() {
                selectCountry(country, country, flagPath);
            });
            
            countryList.appendChild(option);
        });

        // Mark current selection
        updateSelectedCountry();

        // Populate confidence options
        populateConfidenceOptions();
        
        // Populate strategy options
        populateStrategyOptions();
        
        // Populate sort time options
        populateSortTimeOptions();
    };

    const populateConfidenceOptions = () => {
        const confidenceOptions = [
            { value: '', name: 'All Levels', desc: 'Show all matches', badge: null },
            { value: 'high', name: 'High Confidence', desc: '85% and above', badge: 'high' },
            { value: 'medium', name: 'Medium Confidence', desc: '70% - 85%', badge: 'medium' },
            { value: 'low', name: 'Low Confidence', desc: 'Below 70%', badge: 'low' }
        ];

        confidenceList.innerHTML = '';

        confidenceOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'confidence-option';
            optionEl.setAttribute('data-value', option.value);

            const badge = option.badge ? `<div class="confidence-badge ${option.badge}">${option.name.split(' ')[0]}</div>` : '';
            
            optionEl.innerHTML = `
                <div class="confidence-option-info">
                    <div class="confidence-option-name">${option.name}</div>
                    <div class="confidence-option-desc">${option.desc}</div>
                </div>
                ${badge}
            `;

            optionEl.addEventListener('click', function() {
                selectConfidence(option.value, option.name);
            });

            confidenceList.appendChild(optionEl);
        });

        // Mark current selection
        updateSelectedConfidence();
    };

    const populateStrategyOptions = () => {
        const strategyOptions = [
            { value: '', name: 'All Strategies', desc: 'Show all matches', badge: null },
            { value: 'x-brothers', name: 'X-BROTHERS', desc: 'X odds between 3.00 - 4.00', badge: 'special' }
        ];

        strategyList.innerHTML = '';

        strategyOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'strategy-option';
            optionEl.setAttribute('data-value', option.value);

            const badge = option.badge ? `<div class="strategy-badge ${option.badge}">${option.name}</div>` : '';
            
            optionEl.innerHTML = `
                <div class="strategy-option-info">
                    <div class="strategy-option-name">${option.name}</div>
                    <div class="strategy-option-desc">${option.desc}</div>
                </div>
                ${badge}
            `;

            optionEl.addEventListener('click', function() {
                selectStrategy(option.value, option.name);
            });

            strategyList.appendChild(optionEl);
        });

        // Mark current selection
        updateSelectedStrategy();
    };

    const populateSortTimeOptions = () => {
        const sortTimeOptions = [
            { value: '', name: 'Competition Groups', desc: 'Show matches grouped by competition', badge: null },
            { value: 'time-asc', name: 'Time (Earliest First)', desc: 'Sort all matches by kick-off time', badge: 'time' }
        ];

        sortTimeList.innerHTML = '';

        sortTimeOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'sort-time-option';
            optionEl.setAttribute('data-value', option.value);

            const badge = option.badge ? `<div class="sort-time-badge ${option.badge}"><i class="fas fa-clock"></i></div>` : '';
            
            optionEl.innerHTML = `
                <div class="sort-time-option-info">
                    <div class="sort-time-option-name">${option.name}</div>
                    <div class="sort-time-option-desc">${option.desc}</div>
                </div>
                ${badge}
            `;

            optionEl.addEventListener('click', function() {
                selectSortTime(option.value, option.name);
            });

            sortTimeList.appendChild(optionEl);
        });

        // Mark current selection
        updateSelectedSortTime();
    };

    const selectConfidence = (value, text) => {
        const selectedConfidenceSpan = confidenceSelectorBtn.querySelector('.selected-confidence');
        selectedConfidenceSpan.textContent = text;
        
        currentFilters.confidence = value;
        updateSelectedConfidence();
        closeConfidenceModal();
        handleFilterChange();
    };

    const updateSelectedConfidence = () => {
        // Remove previous selection
        confidenceList.querySelectorAll('.confidence-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Mark current selection
        const currentOption = confidenceList.querySelector(`[data-value="${currentFilters.confidence}"]`);
        if (currentOption) {
            currentOption.classList.add('selected');
        }
    };

    const selectStrategy = (value, text) => {
        const selectedStrategySpan = strategySelectorBtn.querySelector('.selected-strategy');
        selectedStrategySpan.textContent = text;
        
        currentFilters.strategy = value;
        updateSelectedStrategy();
        closeStrategyModal();
        handleFilterChange();
    };

    const updateSelectedStrategy = () => {
        // Remove previous selection
        strategyList.querySelectorAll('.strategy-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Mark current selection
        const currentOption = strategyList.querySelector(`[data-value="${currentFilters.strategy}"]`);
        if (currentOption) {
            currentOption.classList.add('selected');
        }
    };

    const selectCountry = (value, text, flagPath = '') => {
        const selectedCountrySpan = countrySelectorBtn.querySelector('.selected-country');
        const flagImg = flagPath ? `<img src="${flagPath}" class="country-flag" alt="${text}" onerror="this.style.display='none'">` : '';
        selectedCountrySpan.innerHTML = `${flagImg}<span>${text}</span>`;
        
        currentFilters.competition = value;
        updateSelectedCountry();
        closeCountryModal();
        handleFilterChange();
    };

    const updateSelectedCountry = () => {
        // Remove previous selection
        countryList.querySelectorAll('.country-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Mark current selection
        const currentOption = countryList.querySelector(`[data-value="${currentFilters.competition}"]`);
        if (currentOption) {
            currentOption.classList.add('selected');
        }
    };

    const selectSortTime = (value, text) => {
        const selectedSortTimeSpan = sortTimeSelectorBtn.querySelector('.selected-sort-time');
        selectedSortTimeSpan.textContent = text;
        
        currentFilters.sortTime = value;
        updateSelectedSortTime();
        closeSortTimeModal();
        handleFilterChange();
    };

    const updateSelectedSortTime = () => {
        // Remove previous selection
        sortTimeList.querySelectorAll('.sort-time-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Mark current selection
        const currentOption = sortTimeList.querySelector(`[data-value="${currentFilters.sortTime}"]`);
        if (currentOption) {
            currentOption.classList.add('selected');
        }
    };

    const filterCountries = () => {
        const searchTerm = countrySearchInput.value.toLowerCase();
        const options = countryList.querySelectorAll('.country-option');
        
        options.forEach(option => {
            const searchData = option.getAttribute('data-search') || '';
            const text = option.textContent.toLowerCase();
            const matches = searchData.includes(searchTerm) || text.includes(searchTerm);
            option.style.display = matches ? 'flex' : 'none';
        });
    };

    const handleFilterChange = () => {
        renderUI();
    };

    const resetFilters = () => {
        selectCountry('', 'All Countries');
        selectConfidence('', 'All Levels');
        selectStrategy('', 'All Strategies');
        selectSortTime('', 'Competition Groups');
        teamSearch.value = '';
        hideStartedToggle.checked = false;
        
        currentFilters = {
            competition: '',
            confidence: '',
            strategy: '',
            sortTime: '',
            search: '',
            hideStarted: false
        };
        
        handleFilterChange();
    };

    // --- Calculations & Helpers ---
    const calculateConfidences = (match) => {
        const p = match.predictions || {};
        const marketAnalysis = p.market_analysis || {};
        const efficiency = (marketAnalysis.market_efficiency || 0.5) * 100;
        
        let scoreConfidence = efficiency;
        if (p.top_3_correct_scores?.length > 0) {
            scoreConfidence = (efficiency + (p.top_3_correct_scores[0].percentage || 0) * 2) / 3;
        }

        let goalsConfidence = efficiency;
        if (p.goals_markets?.['over_2_5']) {
            const over25 = parseFloat(p.goals_markets['over_2_5'] || 0);
            goalsConfidence = efficiency + (Math.abs(over25 - 50) * 0.3);
        }

        let marketsConfidence = efficiency;
        if (p.teams_markets?.both_teams_score) {
            const btts = parseFloat(p.teams_markets.both_teams_score || 0);
            marketsConfidence = efficiency + (Math.abs(btts - 50) * 0.2);
        }
        
        const overall = (scoreConfidence * 1.5 + goalsConfidence + marketsConfidence) / 3.5;

        return {
            overall: Math.min(98, Math.max(40, Math.round(overall))),
            score: Math.min(98, Math.max(40, Math.round(scoreConfidence))),
            goals: Math.min(98, Math.max(40, Math.round(goalsConfidence))),
            markets: Math.min(98, Math.max(40, Math.round(marketsConfidence))),
        };
    };

    // Check if a match has started based on time
    const hasMatchStarted = (match) => {
        if (!match.time || match.time === 'TBD') {
            return false; // Unknown time = not started
        }
        
        const now = new Date();
        const [hours, minutes] = match.time.split(':').map(Number);
        
        // Create match date with current date and match time
        const matchDateTime = new Date(currentDate);
        matchDateTime.setHours(hours, minutes, 0, 0);
        
        // Match has started if current time is past match time
        const started = now > matchDateTime;
        
        return started;
    };

    const matchesConfidenceFilter = (confidence, filter) => {
        if (filter === 'high') return confidence >= 85;
        if (filter === 'medium') return confidence >= 70 && confidence < 85;
        if (filter === 'low') return confidence < 70;
        return true;
    };

    const matchesStrategyFilter = (match, strategy) => {
        if (strategy === 'x-brothers') {
            // X-BROTHERS strategy: Look for matches with X odds between 3.00 and 4.00
            const odds = match.odds || [];
            
            // Odds array format: [home_odds, draw_odds, away_odds]
            // Index 1 is the draw (X) odds
            if (!odds[1]) {
                return false;
            }

            // Convert X odds to number and check if it's between 3.00 and 4.00
            const xOdds = parseFloat(odds[1]);
            
            // Strategy match: X odds between 3.00 and 4.00 (inclusive)
            return xOdds >= 3.00 && xOdds <= 4.00;
        }
        
        return true;
    };

    const getConfidenceClass = (confidence) => {
        if (confidence >= 85) return 'high';
        if (confidence >= 70) return 'medium';
        return 'low';
    };

    const formatMarketName = (key) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getProbabilityBadgeClass = (percentage) => {
        const value = parseFloat(percentage);
        if (value >= 70) return 'high';
        if (value >= 45) return 'medium';
        return 'low';
    };

    const createProbabilityBadge = (value, showPercentage = true) => {
        const badgeClass = getProbabilityBadgeClass(value);
        const displayValue = showPercentage ? `${value}%` : value;
        return `<span class="probability-badge ${badgeClass}">${displayValue}</span>`;
    };

    const calculatePredictionStats = (filteredCompetitions) => {
        let totalRecommendedPredictions = 0;
        let correctRecommendedPredictions = 0;
        
        // Detailed stats for each category
        let topScoresStats = { total: 0, correct: 0 };
        let halftimeStats = { total: 0, correct: 0 };
        let goalsMarketsStats = { total: 0, correct: 0 };
        let teamsMarketsStats = { total: 0, correct: 0 };
        let bookmakerOddsStats = { total: 0, correct: 0 };
        
        filteredCompetitions.forEach(competition => {
            competition.matches.forEach(match => {
                const p = match.predictions || {};
                
                // 1. Top Score (highest-probability) - primul din top_3_correct_scores
                if (p.top_3_correct_scores?.length > 0) {
                    // Doar primul scor (index 0) primește clasa highest-probability
                    const firstScore = p.top_3_correct_scores[0];
                    if (firstScore.status !== undefined) {
                        totalRecommendedPredictions++;
                        topScoresStats.total++;
                        if (firstScore.status === true) {
                            correctRecommendedPredictions++;
                            topScoresStats.correct++;
                        }
                    }
                }
                
                // 1b. Halftime Score - doar dacă primește etichetă (percentage > 50%)
                if (p.most_likely_halftime_score?.status !== undefined && parseFloat(p.most_likely_halftime_score.percentage) > 50) {
                    totalRecommendedPredictions++;
                    halftimeStats.total++;
                    if (p.most_likely_halftime_score.status === true) {
                        correctRecommendedPredictions++;
                        halftimeStats.correct++;
                    }
                }
                
                // 2. Goals Markets (highest-market) - cea cu probabilitatea cea mai mare
                if (p.goals_markets) {
                    const goalsMarkets = Object.entries(p.goals_markets)
                        .filter(([key, value]) => !key.endsWith('_status'));
                    
                    if (goalsMarkets.length > 0) {
                        const maxValue = Math.max(...goalsMarkets.map(([key, value]) => parseFloat(value) || 0));
                        
                        // Găsește market-ul cu probabilitatea cea mai mare
                        const highestMarket = goalsMarkets.find(([key, value]) => parseFloat(value) === maxValue && maxValue > 0);
                        
                        if (highestMarket) {
                            const [marketKey] = highestMarket;
                            const statusKey = `${marketKey}_status`;
                            if (p.goals_markets[statusKey] !== undefined) {
                                totalRecommendedPredictions++;
                                goalsMarketsStats.total++;
                                if (p.goals_markets[statusKey] === true) {
                                    correctRecommendedPredictions++;
                                    goalsMarketsStats.correct++;
                                }
                            }
                        }
                    }
                }
                
                // 3. Teams Markets (highest-team-market) - cea cu probabilitatea cea mai mare peste 50%
                if (p.teams_markets) {
                    const teamsMarkets = Object.entries(p.teams_markets)
                        .filter(([key, value]) => !key.endsWith('_status'));
                    
                    if (teamsMarkets.length > 0) {
                        const validMarkets = teamsMarkets.filter(([key, value]) => parseFloat(value) > 50);
                        
                        if (validMarkets.length > 0) {
                            const maxValue = Math.max(...validMarkets.map(([key, value]) => parseFloat(value)));
                            
                            // Găsește market-ul cu probabilitatea cea mai mare peste 50%
                            const highestTeamMarket = validMarkets.find(([key, value]) => parseFloat(value) === maxValue);
                            
                            if (highestTeamMarket) {
                                const [marketKey] = highestTeamMarket;
                                const statusKey = `${marketKey}_status`;
                                if (p.teams_markets[statusKey] !== undefined) {
                                    totalRecommendedPredictions++;
                                    teamsMarketsStats.total++;
                                    if (p.teams_markets[statusKey] === true) {
                                        correctRecommendedPredictions++;
                                        teamsMarketsStats.correct++;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // 4. Best Odds (best-odds) - bazat pe predicția din top_3_correct_scores
                if (p.top_3_correct_scores?.length > 0 && match.odds) {
                    // Replica logica din createMatchDetailsHTML pentru predictedOutcome
                    let homeWins = 0;
                    let draws = 0;
                    let awayWins = 0;
                    
                    // Analizează toate top 3 scoruri
                    p.top_3_correct_scores.forEach(scoreData => {
                        const [homeGoals, awayGoals] = scoreData.score.split('-').map(Number);
                        
                        if (homeGoals > awayGoals) {
                            homeWins++;
                        } else if (homeGoals < awayGoals) {
                            awayWins++;
                        } else {
                            draws++;
                        }
                    });
                    
                    // Determină rezultatul bazat pe majoritate
                    let predictedOutcome = null;
                    if (homeWins > draws && homeWins > awayWins) {
                        predictedOutcome = '1'; // Home win
                    } else if (awayWins > draws && awayWins > homeWins) {
                        predictedOutcome = '2'; // Away win
                    } else if (draws > homeWins && draws > awayWins) {
                        predictedOutcome = 'X'; // Draw
                    }
                    
                    // Verifică status-ul pentru predicția cea mai probabilă
                    if (predictedOutcome && p.market_analysis) {
                        let statusKey = '';
                        if (predictedOutcome === '1') {
                            statusKey = 'home_win_status';
                        } else if (predictedOutcome === 'X') {
                            statusKey = 'draw_status';
                        } else if (predictedOutcome === '2') {
                            statusKey = 'away_win_status';
                        }
                        
                        if (p.market_analysis[statusKey] !== undefined) {
                            totalRecommendedPredictions++;
                            bookmakerOddsStats.total++;
                            if (p.market_analysis[statusKey] === true) {
                                correctRecommendedPredictions++;
                                bookmakerOddsStats.correct++;
                            }
                        }
                    }
                }
            });
        });
        
        const percentage = totalRecommendedPredictions > 0 ? Math.round((correctRecommendedPredictions / totalRecommendedPredictions) * 100) : 0;
        
        return {
            total: totalRecommendedPredictions,
            correct: correctRecommendedPredictions,
            percentage: percentage,
            details: {
                topScores: topScoresStats,
                halftime: halftimeStats,
                goalsMarkets: goalsMarketsStats,
                teamsMarkets: teamsMarketsStats,
                bookmakerOdds: bookmakerOddsStats
            }
        };
    };

    const updateStatsLabels = (isToday) => {
        const totalLabel = document.querySelector('.stat-item:first-child label');
        const updateLabel = document.querySelector('.stat-item:last-child label');
        
        if (isToday) {
            totalLabel.textContent = 'Matches Analyzed';
            updateLabel.textContent = 'Last Update';
        } else {
            totalLabel.textContent = 'Predictions Won';
            updateLabel.textContent = 'Success Rate';
        }
    };

    const updateStats = (filteredCompetitions) => {
        const total = filteredCompetitions.reduce((sum, comp) => sum + comp.matches.length, 0);
        
        // Check if current date is "Today"
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();
        
        // Update labels based on current date
        updateStatsLabels(isToday);
        
        if (isToday) {
            // Today: Show normal stats
            totalMatchesElement.textContent = total;
            lastUpdateElement.textContent = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
            // Hide detailed stats for today
            updateDetailedStats(null);
        } else {
            // Other days: Show prediction success stats
            const stats = calculatePredictionStats(filteredCompetitions);
            totalMatchesElement.textContent = `${stats.correct}/${stats.total}`;
            lastUpdateElement.textContent = `${stats.percentage}% Success`;
            
            // Only update detailed stats if they don't exist yet (to keep them static)
            if (!staticStatsDetails) {
                updateDetailedStats(stats.details);
            } else {
                // Just restore the active state if needed
                if (currentStatFilter) {
                    // Remove all active classes first
                    document.querySelectorAll('.stat-detail').forEach(detail => {
                        detail.classList.remove('active');
                    });
                    // Add active class to current filter
                    const activeElement = document.querySelector(`[data-category="${currentStatFilter}"]`);
                    if (activeElement) {
                        activeElement.classList.add('active');
                    }
                }
            }
        }
    };

    // Store static details to keep button values unchanged
    let staticStatsDetails = null;

    const updateDetailedStats = (details) => {
        let detailedStatsElement = document.querySelector('.detailed-stats');
        
        if (!details) {
            // Remove detailed stats if they exist
            if (detailedStatsElement) {
                detailedStatsElement.remove();
            }
            staticStatsDetails = null;
            return;
        }
        
        // Store static details on first call to keep button values unchanged
        if (!staticStatsDetails) {
            staticStatsDetails = JSON.parse(JSON.stringify(details));
        }
        
        // Create detailed stats element if it doesn't exist
        if (!detailedStatsElement) {
            detailedStatsElement = document.createElement('div');
            detailedStatsElement.className = 'detailed-stats';
            document.querySelector('.stats-section').appendChild(detailedStatsElement);
        }
        
        // Always use static details to keep button values unchanged
        const displayDetails = staticStatsDetails;
        
        // Build detailed stats HTML with click handlers - show buttons that have data
        const detailedHTML = `
            <div class="stats-breakdown">
                ${displayDetails.topScores.total > 0 ? `<span class="stat-detail" data-category="topScores" onclick="toggleStatDetail(this, 'topScores')">TS: ${displayDetails.topScores.correct}/${displayDetails.topScores.total}</span>` : ''}
                ${displayDetails.halftime.total > 0 ? `<span class="stat-detail" data-category="halftime" onclick="toggleStatDetail(this, 'halftime')">HT: ${displayDetails.halftime.correct}/${displayDetails.halftime.total}</span>` : ''}
                ${displayDetails.goalsMarkets.total > 0 ? `<span class="stat-detail" data-category="goalsMarkets" onclick="toggleStatDetail(this, 'goalsMarkets')">GM: ${displayDetails.goalsMarkets.correct}/${displayDetails.goalsMarkets.total}</span>` : ''}
                ${displayDetails.teamsMarkets.total > 0 ? `<span class="stat-detail" data-category="teamsMarkets" onclick="toggleStatDetail(this, 'teamsMarkets')">TM: ${displayDetails.teamsMarkets.correct}/${displayDetails.teamsMarkets.total}</span>` : ''}
                ${displayDetails.bookmakerOdds.total > 0 ? `<span class="stat-detail" data-category="bookmakerOdds" onclick="toggleStatDetail(this, 'bookmakerOdds')">BO: ${displayDetails.bookmakerOdds.correct}/${displayDetails.bookmakerOdds.total}</span>` : ''}
            </div>
        `;
        
        detailedStatsElement.innerHTML = detailedHTML;
        
        // Restore active state if there's a current filter
        if (currentStatFilter) {
            const activeElement = detailedStatsElement.querySelector(`[data-category="${currentStatFilter}"]`);
            if (activeElement) {
                activeElement.classList.add('active');
            } else {
                // If the current filter button doesn't exist anymore, clear the filter
                currentStatFilter = null;
            }
        }
    };

    // Global variable to store current filter
    let currentStatFilter = null;

    // Toggle stat detail function
    window.toggleStatDetail = (element, category) => {
        // Remove active class from all stat details
        document.querySelectorAll('.stat-detail').forEach(detail => {
            detail.classList.remove('active');
        });

        // If clicking the same category, toggle off
        if (currentStatFilter === category) {
            currentStatFilter = null;
            // Just re-filter the matches without full re-render
            filterAndDisplayMatches();
            return;
        }

        // Set new filter and add active class
        currentStatFilter = category;
        element.classList.add('active');
        
        // Just re-filter the matches without full re-render
        filterAndDisplayMatches();
    };

    // New function to filter and display matches without full re-render
    const filterAndDisplayMatches = () => {
        const filteredData = filterData();
        
        // Update only the matches display
        if (filteredData.length === 0) {
            matchesListSection.innerHTML = ''; // Clear previous content
            noResultsElement.style.display = 'block';
        } else {
            noResultsElement.style.display = 'none';
            
            // Check if X-BROTHERS strategy is selected
            if (currentFilters.strategy === 'x-brothers') {
                // Render simple list for X-BROTHERS
                matchesListSection.innerHTML = createXBrothersListHTML(filteredData);
                // Setup controls after rendering
                setTimeout(() => {
                    setupXBrothersControls();
                }, 100);
            } else {
                // Render normal view with competitions
                matchesListSection.innerHTML = filteredData.map(createCompetitionGroupHTML).join('');
                // Apply competition colors IMMEDIATELY after rendering
                applyCompetitionColors();
            }
        }
        
        // Update stats without changing the detailed stats buttons
        updateStats(filteredData);
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // Store original pairs for shuffling
    let originalXBrothersPairs = [];
    let currentXBrothersPairs = [];

    // Toggle strategy details function
    window.toggleStrategyDetails = () => {
        const details = document.getElementById('strategy-details');
        const readMoreBtn = document.querySelector('.read-more-btn');
        const readMoreText = document.querySelector('.read-more-text');
        const readMoreIcon = document.querySelector('.read-more-icon');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            readMoreText.textContent = 'Read Less';
            readMoreIcon.style.transform = 'rotate(180deg)';
            readMoreBtn.classList.add('expanded');
        } else {
            details.style.display = 'none';
            readMoreText.textContent = 'Read More';
            readMoreIcon.style.transform = 'rotate(0deg)';
            readMoreBtn.classList.remove('expanded');
        }
    };

    // Shuffle X-BROTHERS pairs function
    window.shuffleXBrothersPairs = (event) => {
        if (currentXBrothersPairs.length === 0) return;
        
        // Remove focus from button (fix mobile active state)
        if (event && event.target) {
            event.target.blur();
        }
        
        // Shuffle the current pairs array
        currentXBrothersPairs = [...currentXBrothersPairs].sort(() => Math.random() - 0.5);
        
        // Update display with current limit
        updateXBrothersPairsDisplay();
    };

    // Update pairs display based on slider value
    const updateXBrothersPairsDisplay = () => {
        const slider = document.getElementById('pairs-limit-slider');
        const countDisplay = document.getElementById('pairs-count-display');
        const container = document.getElementById('x-brothers-pairs-container');
        
        if (!container) return;
        
        // If slider doesn't exist (only 1 pair), show just 1 pair
        if (!slider || !countDisplay) {
            const limitedPairs = currentXBrothersPairs.slice(0, Math.min(10, currentXBrothersPairs.length));
            container.innerHTML = limitedPairs.map(createMatchPairHTML).join('');
            return;
        }
        
        const limit = parseInt(slider.value);
        const actualDisplayed = Math.min(limit, currentXBrothersPairs.length);
        countDisplay.textContent = actualDisplayed;
        
        // Update container with limited pairs
        const limitedPairs = currentXBrothersPairs.slice(0, limit);
        container.innerHTML = limitedPairs.map(createMatchPairHTML).join('');
        
        // Update button states
        updatePairsButtonStates();
    };

    // Update plus/minus button states
    const updatePairsButtonStates = () => {
        const slider = document.getElementById('pairs-limit-slider');
        const minusBtn = document.querySelector('.minus-btn');
        const plusBtn = document.querySelector('.plus-btn');
        
        if (!slider || !minusBtn || !plusBtn) return;
        
        const currentValue = parseInt(slider.value);
        const minValue = parseInt(slider.min);
        const maxValue = parseInt(slider.max);
        
        // Disable minus button if at minimum
        minusBtn.disabled = currentValue <= minValue;
        
        // Disable plus button if at maximum
        plusBtn.disabled = currentValue >= maxValue;
    };

    // Increase pairs function for plus button
    window.increasePairs = () => {
        const slider = document.getElementById('pairs-limit-slider');
        if (!slider) return;
        
        const currentValue = parseInt(slider.value);
        const maxValue = parseInt(slider.max);
        
        if (currentValue < maxValue) {
            slider.value = currentValue + 1;
            updateXBrothersPairsDisplay();
        }
    };

    // Decrease pairs function for minus button
    window.decreasePairs = () => {
        const slider = document.getElementById('pairs-limit-slider');
        if (!slider) return;
        
        const currentValue = parseInt(slider.value);
        const minValue = parseInt(slider.min);
        
        if (currentValue > minValue) {
            slider.value = currentValue - 1;
            updateXBrothersPairsDisplay();
        }
    };

    // Setup X-BROTHERS controls event listeners
    const setupXBrothersControls = () => {
        const slider = document.getElementById('pairs-limit-slider');
        if (slider) {
            slider.addEventListener('input', updateXBrothersPairsDisplay);
            // Initialize button states
            setTimeout(() => {
                updatePairsButtonStates();
            }, 100);
        }
    };

    // Auto-refresh available dates every 2 minutes
    const scheduleDataRefresh = () => {
        setInterval(async () => {
            console.log('🔄 Auto-refreshing available dates...');
            const oldDates = [...availableDates]; // Copy current dates
            await discoverAvailableDates(true); // Force refresh
            
            // Check for new dates
            const newDates = availableDates.filter(date => !oldDates.includes(date));
            
            if (newDates.length > 0) {
                console.log(`✨ Found ${newDates.length} new date(s):`, newDates);
                console.log(`📊 Total dates now: ${availableDates.length}`);
                updateDateDisplay(); // Update button states
                
                // Show notification if user is not on the newest date
                if (currentDateIndex > 0) {
                    console.log('💡 New data available! You can navigate to newer dates.');
                }
            } else if (availableDates.length !== oldDates.length) {
                console.log(`📊 Date count changed: ${oldDates.length} → ${availableDates.length}`);
                updateDateDisplay();
            }
        }, 2 * 60 * 1000); // 2 minutes
    };

    // --- Start ---
    initializeApp();
    setupEventListeners();
    scheduleDataRefresh();
    
    // Apply competition colors after initial load
    window.addEventListener('load', () => {
        setTimeout(() => {
            applyCompetitionColors();
        }, 500);
    });
}); 