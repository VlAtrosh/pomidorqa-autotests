import { Locator, Page } from '@playwright/test';

export class SlotsPage {
  readonly page: Page;

  readonly slotsDate: Locator;
  readonly slotsTime: Locator;
  readonly addSlotButton: Locator;
  readonly slotCard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.slotsDate = page.locator('#pomidorqa-slots-date');
    this.slotsTime = page.locator('#pomidorqa-slots-time');
    this.addSlotButton = page.getByRole('button', { name: 'Добавить слот' });
    this.slotCard = page.locator('[data-slot-id]');
  }

  async goToSlots() {
    await this.page.goto('/pomidorqa/profile/slots');
  }

  async addSlot(date: string, time: string) {
    await this.slotsDate.fill(date);
    await this.slotsTime.fill(time);
    await this.addSlotButton.click();
  }
}
