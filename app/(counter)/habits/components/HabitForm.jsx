
"use client";

import { useState } from "react";
import styles from "./HabitForm.module.css";

const today = () => {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const weekDays = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

export default function HabitForm({
  categories,
  saving,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    frequency: "daily",
    target_per_period: "1",
    unit: "times",
    start_date: today(),
    end_date: "",
    schedule_days: [],
    color: "#2563EB",
    icon: "check-circle",
  });

  const [validationError, setValidationError] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleDay = (day) => {
    setForm((current) => {
      const selected = current.schedule_days.includes(day);
      return {
        ...current,
        schedule_days: selected
          ? current.schedule_days.filter((value) => value !== day)
          : [...current.schedule_days, day].sort((a, b) => a - b),
      };
    });
  };

  const handleSubmit = async (event) => {
    console.log(event.target)
    event.preventDefault();
    setValidationError("");

    if (!form.name.trim()) {
      setValidationError("Please enter a habit name.");
      return;
    }

    if (!form.category_id) {
      setValidationError("Please choose a category.");
      return;
    }

    if (
      form.frequency === "selected_days" &&
      form.schedule_days.length === 0
    ) {
      setValidationError("Select at least one day for this habit.");
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setValidationError("The end date cannot be before the start date.");
      return;
    }

    await onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      target_per_period: Number(form.target_per_period),
      end_date: form.end_date || null,
      schedule_days:
        form.frequency === "selected_days" ? form.schedule_days : [],
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <div>
          <h2>Create a habit</h2>
          <p>Make the action small, specific, and repeatable.</p>
        </div>
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          Habit name *
          <input
            name="name"
            value={form.name}
            onChange={updateField}
            placeholder="e.g. Read every day"
            maxLength={150}
            required
          />
        </label>

        <label className={styles.field}>
          Category *
          <select
            name="category_id"
            value={form.category_id}
            onChange={updateField}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
              
            ))}
            <option value='6fa36411-37b9-41e8-af00-8e3afc1cc212'>Health</option>
          </select>
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`}>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            placeholder="Why is this habit important to you?"
            rows={3}
            maxLength={1000}
          />
        </label>

        <label className={styles.field}>
          Frequency
          <select
            name="frequency"
            value={form.frequency}
            onChange={updateField}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="selected_days">Selected days</option>
          </select>
        </label>

        <label className={styles.field}>
          Target per period
          <input
            name="target_per_period"
            type="number"
            min="1"
            max="100000"
            value={form.target_per_period}
            onChange={updateField}
            required
          />
        </label>

        <label className={styles.field}>
          Unit
          <input
            name="unit"
            value={form.unit}
            onChange={updateField}
            placeholder="times, pages, minutes..."
            maxLength={30}
          />
        </label>

        <label className={styles.field}>
          Start date
          <input
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={updateField}
            required
          />
        </label>

        <label className={styles.field}>
          End date (optional)
          <input
            name="end_date"
            type="date"
            value={form.end_date}
            min={form.start_date}
            onChange={updateField}
          />
        </label>

        {form.frequency === "selected_days" && (
          <fieldset className={`${styles.field} ${styles.fullWidth}`}>
            <legend>Repeat on</legend>
            <div className={styles.days}>
              {weekDays.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={form.schedule_days.includes(day.value)}
                  className={
                    form.schedule_days.includes(day.value)
                      ? styles.daySelected
                      : styles.day
                  }
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className={styles.field}>
          Card color
          <input
            name="color"
            type="color"
            value={form.color}
            onChange={updateField}
          />
        </label>
      </div>

      {validationError && (
        <p className={styles.error}>{validationError}</p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={saving}
        >
          {saving ? "Saving..." : "Create habit"}
        </button>
      </div>
    </form>
  );
}
