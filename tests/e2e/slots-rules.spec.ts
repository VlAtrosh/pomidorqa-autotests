import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, cleanupUsersViaApi } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';
import { SlotsPage } from '../pages/SlotsPage';
import { BookingPage } from '../pages/BookingPage';

test.describe('Правила слотов', () => {
  let context: BrowserContext;
  let guestContext: BrowserContext;

  test.afterEach(async () => {
    await cleanupUsersViaApi([context]);
    if (guestContext) await guestContext.close();
  });

  test('нельзя создать слот в прошлом', async ({ browser }) => {
    const runId = Date.now();
    const user = makeUser('test', runId);

    context = await browser.newContext();
    const page = await context.newPage();

    const slots = new SlotsPage(page);

    await test.step('Регистрация через API', async () => {
      await registerUser(context.request, user);
    });

    await test.step('Открываем страницу слотов', async () => {
      await slots.goToSlots();
    });

    await test.step('Пытаемся создать слот на вчера', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pastDate = yesterday.toISOString().slice(0, 10);

      await slots.slotsDate.fill(pastDate);
      await slots.slotsTime.fill('12:00');
      await slots.addSlotButton.click();
    });

    await test.step('Слот не создался', async () => {
      await expect(slots.slotCard).toHaveCount(0);
    });
  });

  test('у забронированного слота нет кнопки удаления', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-booked-${runId}`;
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);

    context = await browser.newContext();
    guestContext = await browser.newContext();

    const hostPage = await context.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    await test.step('Регистрация хоста и гостя через API', async () => {
      await registerUser(context.request, host);
      await registerUser(guestContext.request, guest);
    });

    await test.step('Хост: добавляет навык', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Хост: добавляет свободный слот', async () => {
      await hostSlots.goToSlots();
      const date = addDate();
      await hostSlots.addSlot(date, '12:00');
      await expect(hostSlots.slotCard.first()).toBeVisible();
    });

    await test.step('До бронирования у слота есть кнопка "Удалить"', async () => {
      const freeSlot = hostPage.locator('[data-slot-status="free"]');
      await expect(freeSlot.first()).toBeVisible();
      await expect(freeSlot.first().getByRole('button', { name: 'Удалить' })).toBeVisible();
    });

    await test.step('Гость: бронирует слот', async () => {
      await guestBooking.openCatalog();
      await guestBooking.searchInCatalog(skillTag);
      await guestBooking.openPersonCard(host.name);
      await expect(async () => {
        await guestBooking.selectFirstSlot();
        await expect(guestBooking.confirmDialog).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 15_000 });
      await guestBooking.clickConfirm();
      await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Хост: открывает страницу слотов заново', async () => {
      await hostSlots.goToSlots();
    });

    await test.step('После бронирования у слота нет кнопки "Удалить"', async () => {
      const bookedSlot = hostPage.locator('[data-slot-status="booked"]');
      await expect(bookedSlot.first()).toBeVisible({ timeout: 10_000 });

      await expect(bookedSlot.first().getByRole('button', { name: 'Удалить' })).toHaveCount(0);
    });
  });

  test('хост может удалить свободный слот', async ({ browser }) => {
    const runId = Date.now();
    const user = makeUser('test', runId);

    context = await browser.newContext();
    const page = await context.newPage();

    const slots = new SlotsPage(page);

    await test.step('Регистрация через API', async () => {
      await registerUser(context.request, user);
    });

    await test.step('Создаём свободный слот', async () => {
      await slots.goToSlots();
      const date = addDate();
      await slots.addSlot(date, '12:00');
      await expect(slots.slotCard.first()).toBeVisible();
    });

    await test.step('Удаляем слот', async () => {
      const freeSlot = page.locator('[data-slot-status="free"]');
      await freeSlot.first().getByRole('button', { name: 'Удалить' }).click();
    });

    await test.step('Слот исчез из списка', async () => {
      await expect(slots.slotCard).toHaveCount(0, { timeout: 10_000 });
    });
  });
});
