/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // console.log('purchase',purchase);
  const { discount, sale_price, quantity } = purchase;
  const { purchase_price } = _product;
  const totalSale = sale_price * quantity;
  const totalCost = purchase_price * quantity;
  return totalSale - (totalSale * discount) / 100 - totalCost;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller; // Деструктуризация объекта seller для получения profit
  if (index === 0) return profit * 0.15; // 15% для первого места
  if (index === 1 || index === 2) return profit * 0.1; // 10% для второго и третьего
  if (index < total - 1) return profit * 0.05; // 5% для всех кроме последнего
  return 0; // 0% для последнего
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }
  // @TODO: // Проверка наличия опций
  if (typeof options !== "object" || options === null) {
    throw new Error("Опции должны быть объектом");
  }

  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Неверные функции в опциях");
  }
  // Индексация товаров
  const productIndex = data.products.reduce((acc, product) => {
    acc[product.sku] = product;
    return acc;
  }, {});

  // @TODO: Подготовка промежуточных данных для сбора статистики
  // Инициализация статистики продавцов
  const sellerStats = data.sellers.map((seller) => ({
    seller_id: seller.id,
    first_name: seller.first_name,
    last_name: seller.last_name,
    position: seller.position,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // @TODO: // Индексация продавцов для быстрого доступа
  const sellerIndex = sellerStats.reduce((acc, seller) => {
    acc[seller.seller_id] = seller;
    return acc;
  }, {});

  // Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    // Увеличиваем счетчик продаж
    seller.sales_count += 1;

    // Добавляем общую сумму чека к выручке
    seller.revenue += record.total_amount;

    // Обрабатываем каждую позицию в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return;

      // // Рассчитываем выручку по позиции
      // const itemRevenue = item.sale_price * item.quantity - item.discount;
      // seller.revenue += itemRevenue;

      // Рассчитываем прибыль по позиции
      const itemProfit = calculateRevenue(item, product);
      seller.profit += itemProfit;

      // Учет количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });
  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);
  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    // Расчет бонуса
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    // Формирование топ-10 продуктов
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });
  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: parseFloat(seller.revenue.toFixed(2)),
    profit: parseFloat(seller.profit.toFixed(2)),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: parseFloat(seller.bonus.toFixed(2)),
  }));
}
