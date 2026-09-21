import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, cleanupUsersViaApi } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';
import { SlotsPage } from '../pages/SlotsPage';
import { BookingPage } from '../pages/BookingPage';

test.describe('Отмена брони хостом', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;

  test.afterEach(async () => {
    await cleanupUsersViaApi([hostContext, guestContext]);
  });

  test('хост может отменить бронь, гость видит отмену', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-host-cancel-${runId}`;
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    let bookingId: string;

    await test.step('Регистрация хоста и гостя через API', async () => {
      await registerUser(hostContext.request, host);
      await registerUser(guestContext.request, guest);
    });

    await test.step('Хост: добавляет навык', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Хост: добавляет слот на завтра', async () => {
      await hostSlots.goToSlots();
      const date = addDate();
      await hostSlots.addSlot(date, '12:00');
      await expect(hostSlots.slotCard.first()).toBeVisible();
    });

    await test.step('Гость: находит хоста и бронирует слот', async () => {
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

    await test.step('Гость: получает ID бронирования', async () => {
      await guestBooking.goToBookings();
      bookingId = await guestBooking.getFirstUpcomingBookingId();
    });

    await test.step('Хост: открывает "Мои встречи"', async () => {
      await hostBooking.goToBookings();
    });

    await test.step('Хост видит бронь гостя', async () => {
      const hostCard = hostBooking.getBookingCardById(bookingId, 'upcoming');
      await expect(hostCard).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Хост отменяет бронь', async () => {
      await hostBooking.cancelBookingById(bookingId);
    });

    await test.step('Хост: карточка переместилась в "Отменённые"', async () => {
      const canceledCard = hostBooking.getBookingCardById(bookingId, 'canceled');
      await expect(canceledCard).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Гость: открывает "Мои встречи"', async () => {
      await guestBooking.goToBookings();
    });

    await test.step('Гость видит отменённую бронь', async () => {
      const guestCanceledCard = guestBooking.getBookingCardById(bookingId, 'canceled');
      await expect(guestCanceledCard).toBeVisible({ timeout: 10_000 });
    });
  });
});
