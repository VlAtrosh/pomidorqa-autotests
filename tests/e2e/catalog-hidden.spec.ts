import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, cleanupUsersViaApi } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';
import { SlotsPage } from '../pages/SlotsPage';
import { BookingPage } from '../pages/BookingPage';

test.describe('Каталог: скрытие хостов', () => {
  let hostContext: BrowserContext;
  let guest1Context: BrowserContext;
  let guest2Context: BrowserContext;

  test.afterEach(async () => {
    await cleanupUsersViaApi([hostContext, guest1Context, guest2Context]);
  });

  test('хост с забронированным слотом не виден в каталоге другому гостю', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-hidden-${runId}`;
    const host = makeUser('host', runId);
    const guest1 = makeUser('guest1', runId);
    const guest2 = makeUser('guest2', runId);

    hostContext = await browser.newContext();
    guest1Context = await browser.newContext();
    guest2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const guest1Booking = new BookingPage(guest1Page);
    const guest2Booking = new BookingPage(guest2Page);

    await test.step('Регистрация хоста и двух гостей через API', async () => {
      await registerUser(hostContext.request, host);
      await registerUser(guest1Context.request, guest1);
      await registerUser(guest2Context.request, guest2);
    });

    await test.step('Хост: добавляет навык', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Хост: добавляет единственный свободный слот', async () => {
      await hostSlots.goToSlots();
      const date = addDate();
      await hostSlots.addSlot(date, '12:00');
      await expect(hostSlots.slotCard.first()).toBeVisible();
    });

    await test.step('Контроль: гость1 видит хоста в каталоге', async () => {
      await guest1Booking.openCatalog();
      await guest1Booking.searchInCatalog(skillTag);
      await expect(guest1Booking.personCardByName(host.name)).toBeVisible();
    });

    await test.step('Гость1: бронирует слот хоста', async () => {
      await guest1Booking.openPersonCard(host.name);
      await expect(async () => {
        await guest1Booking.selectFirstSlot();
        await expect(guest1Booking.confirmDialog).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 15_000 });
      await guest1Booking.clickConfirm();
      await expect(guest1Booking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Гость2: открывает каталог', async () => {
      await guest2Booking.openCatalog();
    });

    await test.step('Гость2: ищет хоста по навыку', async () => {
      await guest2Booking.searchInCatalog(skillTag);
    });

    await test.step('Гость2 не видит хоста в каталоге (все слоты забронированы)', async () => {
      await expect(guest2Booking.catalogEmpty).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Карточек в выдаче нет', async () => {
      await expect(guest2Booking.personCards).toHaveCount(0);
    });
  });
});
