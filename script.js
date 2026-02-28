class CoinKeeperApp {
    constructor() {
        // Данные
        this.balance = 0;
        this.transactions = [];
        this.debts = [];
        this.investments = [];
        this.categories = {
            income: [
                { id: 'salary', name: 'Зарплата', icon: '💼', amount: 0 },
                { id: 'freelance', name: 'Фриланс', icon: '💻', amount: 0 },
                { id: 'invest', name: 'Инвестиции', icon: '📈', amount: 0 },
                { id: 'gift', name: 'Подарки', icon: '🎁', amount: 0 },
                { id: 'other_inc', name: 'Другое', icon: '📦', amount: 0 }
            ],
            expense: [
                { id: 'food', name: 'Продукты', icon: '🍎', amount: 0, budget: 10000 },
                { id: 'transport', name: 'Транспорт', icon: '🚗', amount: 0, budget: 5000 },
                { id: 'entertainment', name: 'Развлечения', icon: '🎮', amount: 0, budget: 5000 },
                { id: 'shopping', name: 'Покупки', icon: '🛍️', amount: 0, budget: 8000 },
                { id: 'utilities', name: 'Коммуналка', icon: '💡', amount: 0, budget: 6000 },
                { id: 'health', name: 'Здоровье', icon: '🏥', amount: 0, budget: 3000 },
                { id: 'education', name: 'Образование', icon: '📚', amount: 0, budget: 4000 },
                { id: 'other_exp', name: 'Прочее', icon: '📦', amount: 0, budget: 5000 }
            ]
        };
        
        this.recurringPayments = [];
        this.goals = [];
        this.currentPeriod = 'month';
        
        this.initTelegram();
        this.loadData();
        this.initUI();
        this.renderAll();
    }

    initTelegram() {
        this.tg = window.Telegram.WebApp;
        this.tg.ready();
        this.tg.expand();
        
        if (this.tg.colorScheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        }
    }

    loadData() {
        const saved = localStorage.getItem('coinkeeper_data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.balance = data.balance || 0;
                this.transactions = data.transactions || [];
                this.debts = data.debts || [];
                this.investments = data.investments || [];
                this.categories = data.categories || this.categories;
            } catch (e) {
                console.error('Ошибка загрузки', e);
            }
        }
    }

    saveData() {
        const data = {
            balance: this.balance,
            transactions: this.transactions,
            debts: this.debts,
            investments: this.investments,
            categories: this.categories
        };
        localStorage.setItem('coinkeeper_data', JSON.stringify(data));
    }

    initUI() {
        // Табы
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Периоды
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.renderStats();
            });
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
        
        // Обновляем данные при переключении
        if (tabId === 'main') this.renderMainScreen();
        if (tabId === 'debts') this.renderDebts();
        if (tabId === 'invest') this.renderInvestments();
        if (tabId === 'stats') this.renderStats();
        if (tabId === 'budget') this.renderBudget();
    }

    // ========== ОСНОВНОЙ ЭКРАН (МОНЕТНИЦА) ==========
    renderMainScreen() {
        this.renderCategories();
        this.renderTransactions();
        this.updateBalance();
    }

    renderCategories() {
        // Категории расходов
        const expenseGrid = document.getElementById('expenseCategories');
        expenseGrid.innerHTML = this.categories.expense.map(cat => `
            <div class="category-item" onclick="app.showExpenseModal('${cat.id}')">
                <div class="category-icon">${cat.icon}</div>
                <div class="category-name">${cat.name}</div>
                <div class="category-amount">${this.formatMoney(cat.amount)}</div>
            </div>
        `).join('');

        // Категории доходов
        const incomeGrid = document.getElementById('incomeCategories');
        incomeGrid.innerHTML = this.categories.income.map(cat => `
            <div class="category-item category-income" onclick="app.addIncomeToCategory('${cat.id}')">
                <div class="category-icon">${cat.icon}</div>
                <div class="category-name">${cat.name}</div>
                <div class="category-amount">${this.formatMoney(cat.amount)}</div>
            </div>
        `).join('');
    }

    renderTransactions() {
        const list = document.getElementById('transactionsList');
        const recent = this.transactions.slice(-10).reverse();
        
        list.innerHTML = recent.map(t => `
            <div class="transaction-item transaction-${t.type}">
                <div class="transaction-left">
                    <div class="transaction-icon">${t.icon}</div>
                    <div class="transaction-details">
                        <span class="transaction-name">${t.category}</span>
                        <span class="transaction-date">${new Date(t.date).toLocaleString()}</span>
                    </div>
                </div>
                <span class="transaction-amount">${t.type === 'income' ? '+' : '-'}${this.formatMoney(t.amount)}</span>
            </div>
        `).join('');
    }

    // Быстрое добавление дохода
    addQuickIncome() {
        const amount = parseFloat(document.getElementById('quickAmount').value);
        if (!amount || amount <= 0) {
            this.showToast('Введите сумму', 'error');
            return;
        }
        
        this.addTransaction({
            amount: amount,
            category: 'Быстрый доход',
            icon: '💰',
            type: 'income'
        });
        
        this.balance += amount;
        document.getElementById('quickAmount').value = '';
        this.saveData();
        this.renderMainScreen();
        this.showToast('Доход добавлен', 'success');
    }

    // Показать модалку с категориями расходов
    showExpenseCategories() {
        const modal = document.getElementById('categoryModal');
        const modalCategories = document.getElementById('modalCategories');
        
        modalCategories.innerHTML = this.categories.expense.map(cat => `
            <div class="category-item" onclick="app.addExpense('${cat.id}')">
                <div class="category-icon">${cat.icon}</div>
                <div class="category-name">${cat.name}</div>
            </div>
        `).join('');
        
        modal.classList.add('active');
    }

    // Добавление расхода
    addExpense(categoryId) {
        const amount = parseFloat(document.getElementById('quickAmount').value);
        if (!amount || amount <= 0) {
            this.showToast('Введите сумму', 'error');
            return;
        }
        
        const category = this.categories.expense.find(c => c.id === categoryId);
        
        this.addTransaction({
            amount: amount,
            category: category.name,
            icon: category.icon,
            type: 'expense'
        });
        
        category.amount += amount;
        this.balance -= amount;
        
        document.getElementById('quickAmount').value = '';
        this.closeModal();
        this.saveData();
        this.renderMainScreen();
        this.showToast('Расход добавлен', 'success');
    }

    // Добавление дохода в категорию
    addIncomeToCategory(categoryId) {
        const amount = parseFloat(document.getElementById('quickAmount').value);
        if (!amount || amount <= 0) {
            this.showToast('Введите сумму', 'error');
            return;
        }
        
        const category = this.categories.income.find(c => c.id === categoryId);
        
        this.addTransaction({
            amount: amount,
            category: category.name,
            icon: category.icon,
            type: 'income'
        });
        
        category.amount += amount;
        this.balance += amount;
        
        document.getElementById('quickAmount').value = '';
        this.saveData();
        this.renderMainScreen();
        this.showToast('Доход добавлен', 'success');
    }

    addTransaction(transaction) {
        this.transactions.push({
            ...transaction,
            id: Date.now(),
            date: new Date().toISOString()
        });
    }

    closeModal() {
        document.getElementById('categoryModal').classList.remove('active');
    }

    // ========== ДОЛГИ ==========
    addDebt() {
        const name = document.getElementById('debtName').value;
        const amount = parseFloat(document.getElementById('debtAmount').value);
        const interest = parseFloat(document.getElementById('debtInterest').value) || 0;
        const deadline = document.getElementById('debtDeadline').value;
        const type = document.getElementById('debtType').value;
        const priority = document.getElementById('debtPriority').value;

        if (!name || !amount || amount <= 0) {
            this.showToast('Заполните название и сумму', 'error');
            return;
        }

        const debt = {
            id: Date.now(),
            name,
            amount,
            remaining: amount,
            interest,
            deadline,
            type, // owe (я должен) или owed (мне должны)
            priority,
            payments: [],
            date: new Date().toISOString()
        };

        this.debts.push(debt);
        this.saveData();
        this.renderDebts();
        this.showToast('Долг добавлен', 'success');

        // Очистка полей
        document.getElementById('debtName').value = '';
        document.getElementById('debtAmount').value = '';
        document.getElementById('debtInterest').value = '';
        document.getElementById('debtDeadline').value = '';
    }

    renderDebts() {
        const list = document.getElementById('debtsList');
        
        if (this.debts.length === 0) {
            list.innerHTML = '<div class="empty-state">Нет долгов</div>';
            return;
        }

        list.innerHTML = this.debts.map(debt => {
            const paidPercent = ((debt.amount - debt.remaining) / debt.amount * 100).toFixed(1);
            const isOwe = debt.type === 'owe';
            
            return `
                <div class="debt-item ${debt.priority} ${isOwe ? 'debt-owe' : 'debt-owed'}">
                    <div class="debt-header">
                        <span class="debt-name">${debt.name}</span>
                        <span class="debt-amount">${isOwe ? '-' : '+'}${this.formatMoney(debt.remaining)}</span>
                    </div>
                    <div class="debt-details">
                        <span>💰 Всего: ${this.formatMoney(debt.amount)}</span>
                        ${debt.interest ? `<span>📊 ${debt.interest}%</span>` : ''}
                        ${debt.deadline ? `<span>📅 ${new Date(debt.deadline).toLocaleDateString()}</span>` : ''}
                    </div>
                    <div class="debt-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${paidPercent}%"></div>
                        </div>
                    </div>
                    <div class="debt-actions">
                        <button class="btn-success" onclick="app.payDebt(${debt.id})">💰 Оплатить</button>
                        <button class="btn-danger" onclick="app.deleteDebt(${debt.id})">🗑️ Удалить</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    payDebt(id) {
        const debt = this.debts.find(d => d.id === id);
        if (!debt) return;

        const amount = prompt(`Сумма платежа (остаток: ${this.formatMoney(debt.remaining)}):`);
        if (!amount) return;

        const payment = parseFloat(amount);
        if (isNaN(payment) || payment <= 0 || payment > debt.remaining) {
            this.showToast('Некорректная сумма', 'error');
            return;
        }

        debt.remaining -= payment;
        
        // Если я должен - уменьшаем баланс, если мне должны - увеличиваем
        if (debt.type === 'owe') {
            this.balance -= payment;
        } else {
            this.balance += payment;
        }

        debt.payments.push({
            amount: payment,
            date: new Date().toISOString()
        });

        if (debt.remaining <= 0) {
            this.debts = this.debts.filter(d => d.id !== id);
        }

        this.saveData();
        this.renderDebts();
        this.updateBalance();
        this.showToast('Платёж выполнен', 'success');
    }

    deleteDebt(id) {
        if (confirm('Удалить долг?')) {
            this.debts = this.debts.filter(d => d.id !== id);
            this.saveData();
            this.renderDebts();
            this.showToast('Долг удалён', 'success');
        }
    }

    calculateCredit() {
        const amount = parseFloat(document.getElementById('creditAmount').value);
        const rate = parseFloat(document.getElementById('creditRate').value) / 100 / 12;
        const term = parseInt(document.getElementById('creditTerm').value);

        if (!amount || !rate || !term) {
            this.showToast('Заполните все поля', 'error');
            return;
        }

        // Аннуитетный платёж
        const payment = amount * rate * Math.pow(1 + rate, term) / (Math.pow(1 + rate, term) - 1);
        const total = payment * term;
        const overpay = total - amount;

        document.getElementById('creditResult').innerHTML = `
            <div class="credit-result-item">
                <span>Ежемесячный платёж:</span>
                <strong>${this.formatMoney(payment)}</strong>
            </div>
            <div class="credit-result-item">
                <span>Общая сумма выплат:</span>
                <strong>${this.formatMoney(total)}</strong>
            </div>
            <div class="credit-result-item">
                <span>Переплата:</span>
                <strong class="${overpay > 0 ? 'expense' : ''}">${this.formatMoney(overpay)}</strong>
            </div>
        `;
    }

    // ========== ИНВЕСТИЦИИ ==========
    addInvestment() {
        const name = document.getElementById('investName').value;
        const amount = parseFloat(document.getElementById('investAmount').value);
        const price = parseFloat(document.getElementById('investPrice').value);
        const currentPrice = parseFloat(document.getElementById('investCurrentPrice').value) || price;
        const type = document.getElementById('investType').value;

        if (!name || !amount || !price) {
            this.showToast('Заполните все поля', 'error');
            return;
        }

        const quantity = amount / price;
        const currentValue = quantity * currentPrice;

        const investment = {
            id: Date.now(),
            name,
            amount,
            quantity,
            buyPrice: price,
            currentPrice,
            currentValue,
            type,
            date: new Date().toISOString()
        };

        this.investments.push(investment);
        this.saveData();
        this.renderInvestments();
        this.showToast('Инвестиция добавлена', 'success');

        // Очистка
        document.getElementById('investName').value = '';
        document.getElementById('investAmount').value = '';
        document.getElementById('investPrice').value = '';
        document.getElementById('investCurrentPrice').value = '';
    }

    renderInvestments() {
        const list = document.getElementById('investmentsList');
        
        if (this.investments.length === 0) {
            list.innerHTML = '<div class="empty-state">Нет инвестиций</div>';
            return;
        }

        const totalInvested = this.investments.reduce((s, i) => s + i.amount, 0);
        const totalCurrent = this.investments.reduce((s, i) => s + i.currentValue, 0);
        const totalProfit = totalCurrent - totalInvested;
        const profitPercent = (totalProfit / totalInvested * 100).toFixed(1);

        document.getElementById('portfolioStats').innerHTML = `
            <div class="portfolio-summary">
                <div>Инвестировано: ${this.formatMoney(totalInvested)}</div>
                <div>Текущая стоимость: ${this.formatMoney(totalCurrent)}</div>
                <div class="${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    Прибыль: ${totalProfit >= 0 ? '+' : '-'}${this.formatMoney(Math.abs(totalProfit))} (${profitPercent}%)
                </div>
            </div>
        `;

        list.innerHTML = this.investments.map(inv => {
            const profit = inv.currentValue - inv.amount;
            const profitPct = (profit / inv.amount * 100).toFixed(1);
            
            return `
                <div class="investment-item">
                    <div class="investment-header">
                        <span class="investment-name">${inv.name}</span>
                        <span class="investment-profit ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                            ${profit >= 0 ? '+' : '-'}${this.formatMoney(Math.abs(profit))} (${profitPct}%)
                        </span>
                    </div>
                    <div class="investment-details">
                        <span>📊 ${inv.quantity.toFixed(4)} шт.</span>
                        <span>💰 ${this.formatMoney(inv.buyPrice)} → ${this.formatMoney(inv.currentPrice)}</span>
                    </div>
                    <div class="investment-details">
                        <span>📈 Стоимость: ${this.formatMoney(inv.currentValue)}</span>
                    </div>
                    <div class="debt-actions">
                        <button class="btn-success" onclick="app.updateInvestmentPrice(${inv.id})">📊 Обновить цену</button>
                        <button class="btn-danger" onclick="app.deleteInvestment(${inv.id})">🗑️ Удалить</button>
                    </div>
                </div>
            `;
        }).join('');

        this.renderPortfolioChart();
    }

    updateInvestmentPrice(id) {
        const inv = this.investments.find(i => i.id === id);
        if (!inv) return;

        const newPrice = prompt(`Новая цена (текущая: ${this.formatMoney(inv.currentPrice)}):`);
        if (!newPrice) return;

        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) {
            this.showToast('Некорректная цена', 'error');
            return;
        }

        inv.currentPrice = price;
        inv.currentValue = inv.quantity * price;
        
        this.saveData();
        this.renderInvestments();
        this.showToast('Цена обновлена', 'success');
    }

    deleteInvestment(id) {
        if (confirm('Удалить инвестицию?')) {
            this.investments = this.investments.filter(i => i.id !== id);
            this.saveData();
            this.renderInvestments();
            this.showToast('Инвестиция удалена', 'success');
        }
    }

    renderPortfolioChart() {
        const ctx = document.getElementById('portfolioPieChart').getContext('2d');
        
        const data = {
            labels: this.investments.map(i => i.name),
            datasets: [{
                data: this.investments.map(i => i.currentValue),
                backgroundColor: ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6']
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // ========== СТАТИСТИКА ==========
    renderStats() {
        this.renderIncomeExpenseChart();
        this.renderExpensesPieChart();
        this.renderTrendChart();
        this.renderStatsCards();
    }

    renderIncomeExpenseChart() {
        const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
        
        // Группировка по дням за текущий период
        const data = this.getPeriodData();
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Доходы',
                        data: data.income,
                        backgroundColor: '#22c55e'
                    },
                    {
                        label: 'Расходы',
                        data: data.expense,
                        backgroundColor: '#ef4444'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderExpensesPieChart() {
        const ctx = document.getElementById('expensesPieChart').getContext('2d');
        
        const expensesByCategory = this.categories.expense
            .filter(c => c.amount > 0)
            .map(c => ({
                name: c.name,
                amount: c.amount
            }));

        if (expensesByCategory.length === 0) {
            ctx.canvas.parentNode.innerHTML = '<p>Нет данных за период</p>';
            return;
        }

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: expensesByCategory.map(e => e.name),
                datasets: [{
                    data: expensesByCategory.map(e => e.amount),
                    backgroundColor: ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderTrendChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        const data = this.getMonthlyTrend();
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Баланс',
                        data: data.balance,
                        borderColor: '#6366f1',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderStatsCards() {
        const totalIncome = this.transactions
            .filter(t => t.type === 'income')
            .reduce((s, t) => s + t.amount, 0);
            
        const totalExpense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((s, t) => s + t.amount, 0);
            
        const totalDebt = this.debts
            .filter(d => d.type === 'owe')
            .reduce((s, d) => s + d.remaining, 0);
            
        const totalOwed = this.debts
            .filter(d => d.type === 'owed')
            .reduce((s, d) => s + d.remaining, 0);

        const stats = [
            { label: 'Всего доходов', value: this.formatMoney(totalIncome) },
            { label: 'Всего расходов', value: this.formatMoney(totalExpense) },
            { label: 'Я должен', value: this.formatMoney(totalDebt), className: 'expense' },
            { label: 'Мне должны', value: this.formatMoney(totalOwed), className: 'income' }
        ];

        document.getElementById('statsCards').innerHTML = stats.map(s => `
            <div class="stat-card">
                <div class="stat-label">${s.label}</div>
                <div class="stat-value ${s.className || ''}">${s.value}</div>
            </div>
        `).join('');
    }

    getPeriodData() {
        const now = new Date();
        let startDate;
        
        switch(this.currentPeriod) {
            case 'day':
                startDate = new Date(now.setHours(0,0,0,0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
        }

        // Фильтруем транзакции за период
        const periodTransactions = this.transactions.filter(t => new Date(t.date) >= startDate);
        
        // Группируем по дням
        const grouped = {};
        periodTransactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString();
            if (!grouped[date]) {
                grouped[date] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                grouped[date].income += t.amount;
            } else {
                grouped[date].expense += t.amount;
            }
        });

        return {
            labels: Object.keys(grouped).slice(-7),
            income: Object.values(grouped).map(v => v.income).slice(-7),
            expense: Object.values(grouped).map(v => v.expense).slice(-7)
        };
    }

    getMonthlyTrend() {
        const months = [];
        const balances = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            months.push(date.toLocaleDateString('ru-RU', { month: 'short' }));
            
            // Считаем баланс на конец месяца (упрощённо)
            const monthTransactions = this.transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === date.getMonth() && 
                       tDate.getFullYear() === date.getFullYear();
            });
            
            let monthBalance = 0;
            monthTransactions.forEach(t => {
                monthBalance += t.type === 'income' ? t.amount : -t.amount;
            });
            
            balances.push(monthBalance);
        }
        
        return { labels: months, balance: balances };
    }

    // ========== БЮДЖЕТ ==========
    renderBudget() {
        this.renderBudgetProgress();
        this.renderRecurring();
        this.renderGoals();
    }

    renderBudgetProgress() {
        const container = document.querySelector('.budget-progress');
        if (!container) return;

        container.innerHTML = this.categories.expense.map(cat => {
            const spent = cat.amount;
            const budget = cat.budget || 0;
            const percent = budget > 0 ? (spent / budget * 100).toFixed(1) : 0;
            const isOver = spent > budget;

            return `
                <div class="budget-item">
                    <div style="display:flex; justify-content:space-between;">
                        <span>${cat.icon} ${cat.name}</span>
                        <span class="${isOver ? 'expense' : ''}">${this.formatMoney(spent)} / ${this.formatMoney(budget)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${isOver ? 'over-budget' : ''}" 
                             style="width: ${Math.min(percent, 100)}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showBudgetSetup() {
        const budgetStr = prompt('Введите бюджет для каждой категории (в формате: категория:сумма, через запятую)\nНапример: Продукты:10000, Транспорт:5000');
        if (!budgetStr) return;

        const budgets = budgetStr.split(',').map(b => b.trim());
        budgets.forEach(b => {
            const [name, amount] = b.split(':');
            const category = this.categories.expense.find(c => 
                c.name.toLowerCase().includes(name.toLowerCase())
            );
            if (category && amount) {
                category.budget = parseFloat(amount);
            }
        });

        this.saveData();
        this.renderBudget();
        this.showToast('Бюджет обновлён', 'success');
    }

    renderRecurring() {
        // Заглушка для регулярных платежей
    }

    renderGoals() {
        // Заглушка для целей
    }

    addRecurringPayment() {
        this.showToast('Функция в разработке', 'info');
    }

    addGoal() {
        this.showToast('Функция в разработке', 'info');
    }

    // ========== УТИЛИТЫ ==========
    formatMoney(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    updateBalance() {
        document.getElementById('balance').textContent = this.formatMoney(this.balance);
    }

    showToast(message, type = 'info') {
        // Используем Telegram Alert для простоты
        this.tg.showAlert(message);
    }

    renderAll() {
        this.renderMainScreen();
        this.renderDebts();
        this.renderInvestments();
        this.renderStats();
        this.renderBudget();
    }
}

// Инициализация
const app = new CoinKeeperApp();

// Глобальные функции для HTML
window.app = app;