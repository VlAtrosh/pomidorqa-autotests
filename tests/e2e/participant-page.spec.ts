import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, cleanupUsersViaApi } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';
import { SlotsPage } from '../pages/SlotsPage';
import { BookingPage } from '../pages/BookingPage';

test.describe('Страница участника', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;

  test.afterEach(async () => {
    await cleanupUsersViaApi([hostContext, guestContext]);
  });

  test('забронированный слот не показывается на странице участника', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-participant-${runId}`;
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    await test.step('Регистрация хоста и гостя через API', async () => {
      await registerUser(hostContext.request, host);
      await registerUser(guestContext.request, guest);
    });

    await test.step('Хост: добавляет навык', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostSlots.goToSlots();
      const date = addDate();
      await hostSlots.addSlot(date, '12:00');
      await expect(hostSlots.slotCard.first()).toBeVisible();
    });

    await test.step('Гость: бронирует слот хоста', async () => {
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

    await test.step('Гость: открывает страницу хоста заново', async () => {
      await guestBooking.openCatalog();
      await guestBooking.searchInCatalog(skillTag);
      await guestBooking.openPersonCard(host.name);
    });

    await test.step('Забронированный слот не отображается в календаре', async () => {
      const dayChips = guestBooking.calendarDay;

      const hasCalendar = (await dayChips.count()) > 0;

      if (hasCalendar) {
        await expect(guestBooking.calendarTime).toHaveCount(0, { timeout: 5_000 });
      }
    });
  });
});
