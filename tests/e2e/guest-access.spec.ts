import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, cleanupUsersViaApi } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';
import { BookingPage } from '../pages/BookingPage';
import { SlotsPage } from '../pages/SlotsPage';

test.describe('Гостевой доступ', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;

  test.afterEach(async () => {
    await cleanupUsersViaApi([hostContext]);
    await guestContext.close();
  });

  test('гость видит слоты хоста, но не может бронировать', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-guest-${runId}`;
    const host = makeUser('host', runId);

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    await test.step('Хост: регистрация через API', async () => {
      await registerUser(hostContext.request, host);
    });

    await test.step('Хост: добавляет навык', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostSlots.goToSlots();
      const date = addDate();
      await hostSlots.addSlot(date, '12:00');
    });

    await test.step('Гость: открывает каталог', async () => {
      await guestBooking.openCatalog();
    });

    await test.step('Гость: ищет хоста по навыку', async () => {
      await guestBooking.searchInCatalog(skillTag);
    });

    await test.step('Гость: открывает карточку хоста', async () => {
      await guestBooking.openPersonCard(host.name);
    });

    await test.step('Гость видит свободный слот хоста', async () => {
      await expect(guestBooking.calendarDay.first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Гость: кликает по слоту и открывает модалку', async () => {
      await expect(async () => {
        await guestBooking.selectFirstSlot();
        await expect(guestBooking.confirmDialog).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 15_000 });
    });

    await test.step('Гость: нажимает «Подтвердить»', async () => {
      await guestBooking.clickConfirm();
    });

    await test.step('Гость видит сообщение «Нужно войти в аккаунт»', async () => {
      await expect(guestBooking.confirmError).toBeVisible({ timeout: 5_000 });
      await expect(guestBooking.confirmError).toHaveText('Нужно войти в аккаунт PomidorQA');
    });

    await test.step('Гость не может завершить бронирование', async () => {
      await expect(guestBooking.confirmDialog).toBeVisible();
      await expect(guestBooking.confirmSuccess).toBeHidden();
    });
  });
});
