import { Locator, Page } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;

  // Поля профиля
  readonly nameInput: Locator;
  readonly telegramInput: Locator;
  readonly timezoneSelect: Locator;
  readonly bioInput: Locator;
  readonly saveButton: Locator;

  readonly skillInput: Locator;
  readonly skillTypeSelect: Locator;
  readonly addSkillButton: Locator;
  readonly wantToLearnSkills: Locator;
  readonly canHelpSkills: Locator;
  readonly skillChips: Locator;
  readonly skillTag = (tag: string) => this.page.locator(`[data-skill-tag="${tag}"]`);
  readonly removeSkillButton = (tag: string) =>
    this.page.locator(`span[data-skill-tag="${tag}"] button[type="submit"]`);

  constructor(page: Page) {
    this.page = page;

    // Поля профиля
    this.nameInput = page.getByRole('textbox', { name: 'Имя' });
    this.telegramInput = page.getByRole('textbox', { name: 'Telegram' });
    this.timezoneSelect = page.getByLabel('Часовой пояс');
    this.bioInput = page.getByRole('textbox', { name: 'О себе' });
    this.saveButton = page.getByRole('button', { name: 'Сохранить' });

    // Навыки
    this.skillInput = page.locator('#pomidorqa-profile-skill-input');
    this.skillTypeSelect = page.locator('#pomidorqa-profile-skill-type');
    this.addSkillButton = page.getByRole('button', { name: 'Добавить' });
    // this.canHelpSkills = page.getByTestId('can-help-skills');
    this.canHelpSkills = page.locator('[data-skills="can_help"]');
    this.wantToLearnSkills = page.locator('[data-skills="want_to_learn"]');
    this.skillChips = page.locator('[data-skill-tag]');
  }

  // ===== Действия: профиль =====
  async changeName(name: string) {
    await this.fillName(name);
    await this.saveProfile();
  }

  async changeTelegram(telegram: string) {
    await this.fillTelegram(telegram);
    await this.saveProfile();
  }

  async changeTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
    await this.saveProfile();
  }

  async changeBio(bio: string) {
    await this.fillBio(bio);
    await this.saveProfile();
  }

  async saveProfile() {
    const saved = this.page.waitForResponse(
      (res) => res.url().includes('/pomidorqa/profile') && res.request().method() === 'POST',
    );
    await this.saveButton.click();
    await saved;
  }

  // ===== Действия: навыки =====
  async addSkill(tag: string, type: 'can_help' | 'want_to_learn') {
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();
  }

  async removeSkill(tag: string) {
    await this.removeSkillButton(tag).click();
  }

  // ===== Заполнение без сохранения =====
  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillTelegram(telegram: string) {
    await this.telegramInput.fill(telegram);
  }

  async fillBio(bio: string) {
    await this.bioInput.fill(bio);
  }

  // ===== Навигация =====
  async goto() {
    await this.page.goto('/pomidorqa/profile');
  }
}
