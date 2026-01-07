import { component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import type { Signal } from "@builder.io/qwik";

const IMAGE_WIDTH = 843;
const IMAGE_HEIGHT = 809;
const colors = {
  // Main colors
  primary: "#3b82f6", // Blue for selected/buttons
  success: "#10b981", // Green for correct
  error: "#ef4444", // Red for incorrect
  dark: "#1f2937", // Dark text

  // Backgrounds
  bg: {
    page: "#f9fafb", // Page background
    card: "white", // Card background
    primary: "#eff6ff", // Primary background (blue tint)
    success: "#f0fdf4", // Success background (green tint)
    error: "#fef2f2", // Error background (red tint)
  },

  // Text
  text: {
    primary: "#1f2937", // Primary text
    secondary: "#64748b", // Secondary text
    light: "rgba(255, 255, 255, 0.9)", // Light text on dark
  },

  // Borders & UI
  border: "#d1d5db", // Default border
  white: "white",
};

interface Quiz {
  image: string;
  quiz_title: string;
  questions: {
    difficulty: string;
    question_text: string;
    options: {
      A: string;
      B: string;
      C: string;
    };
    correct_answer: string;
  }[];
  provenance: string[];
}

export const useQuiz = routeLoader$(async ({ env }) => {
  const today = new Date().toJSON().split("T")[0];
  const url = `${env.get("QUIZ_URL")}/${today}.json`;
  const response = await fetch(url);
  return (await response.json()) as Quiz;
});

const updateStreak = () => {
  const streak = JSON.parse(localStorage.getItem("streak") || "{}");
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const initialStreak = { date: today, streak: 1 };

  const isFirstTimePlaying = !streak.date;
  if (isFirstTimePlaying) {
    localStorage.setItem("streak", JSON.stringify(initialStreak));
    return;
  }

  const alreadyPlayedToday = streak.date === today;
  if (alreadyPlayedToday) {
    return;
  }

  // Calculate yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const wasPlayedYesterday = streak.date === yesterdayStr;
  if (wasPlayedYesterday) {
    streak.streak += 1;
    streak.date = today;
    localStorage.setItem("streak", JSON.stringify(streak));
  }
};

const getStreak = () => {
  const streak = JSON.parse(localStorage.getItem("streak") || "{}");

  return streak.streak || 1;
};

interface QuestionsProps {
  correctAnswersSignal: Signal<number>;
  showResultsSignal: Signal<boolean>;
  quiz: Signal<Quiz>;
}

const Questions = component$<QuestionsProps>((props) => {
  const selectedAnswerSignal = useSignal("");
  const revealedAnswerSignal = useSignal(false);
  const currentQuestionIndexSignal = useSignal(0);

  const currentQuestion =
    props.quiz.value.questions[currentQuestionIndexSignal.value];

  const getOptionStyle = (key: string) => {
    let borderColor = colors.border;
    let backgroundColor = colors.white;

    if (revealedAnswerSignal.value) {
      if (key === currentQuestion.correct_answer) {
        borderColor = colors.success;
        backgroundColor = colors.bg.success;
      } else if (selectedAnswerSignal.value === key) {
        borderColor = colors.error;
        backgroundColor = colors.bg.error;
      }
    } else {
      if (selectedAnswerSignal.value === key) {
        borderColor = colors.primary;
        backgroundColor = colors.bg.primary;
      }
    }

    return {
      width: "100%",
      textAlign: "left" as const,
      padding: "1rem",
      border: "2px solid",
      borderRadius: "8px",
      borderColor,
      backgroundColor,
      cursor: "pointer",
      marginBottom: "0.75rem",
      transition: "all 0.15s ease-out",
      fontSize: "1rem",
      color: colors.text.primary,
      fontWeight: "500",
      boxShadow:
        selectedAnswerSignal.value === key && !revealedAnswerSignal.value
          ? "0 2px 8px rgba(59, 130, 246, 0.2)"
          : "0 1px 3px rgba(0, 0, 0, 0.05)",
      transform:
        selectedAnswerSignal.value === key && !revealedAnswerSignal.value
          ? "scale(0.98)"
          : "scale(1)",
    };
  };

  const getButtonStyle = () => {
    let bgColor = colors.primary;
    if (revealedAnswerSignal.value) {
      bgColor = colors.success;
    }

    return {
      padding: "1rem 1.5rem",
      backgroundColor: !selectedAnswerSignal.value ? colors.border : bgColor,
      color: colors.white,
      fontWeight: "600",
      fontSize: "1.0625rem",
      cursor: !selectedAnswerSignal.value ? "not-allowed" : "pointer",
      border: "none",
      borderRadius: "8px",
      transition: "all 0.15s ease-out",
      width: "100%",
      boxShadow: selectedAnswerSignal.value
        ? "0 4px 12px rgba(59, 130, 246, 0.25)"
        : "none",
    };
  };

  return (
    <>
      <h2
        style={{
          fontSize: "1.125rem",
          fontWeight: "600",
          margin: 0,
          lineHeight: "1.5",
        }}
      >
        <span style={{ opacity: 0.7, fontSize: "0.875rem" }}>
          {currentQuestionIndexSignal.value + 1}/
          {props.quiz.value.questions.length}{" "}
        </span>
        {currentQuestion.question_text}
      </h2>

      <div style={{ margin: "0.75rem 0" }}>
        {Object.entries(currentQuestion.options).map(([key, value]) => (
          <button
            key={key}
            style={getOptionStyle(key)}
            onClick$={() => {
              selectedAnswerSignal.value = key;
            }}
            disabled={!!revealedAnswerSignal.value}
          >
            {value}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexDirection: "column",
        }}
      >
        <button
          onClick$={() => {
            const isUserSubmitting = !revealedAnswerSignal.value;
            if (isUserSubmitting) {
              revealedAnswerSignal.value = true;

              const isAnswerCorrect =
                selectedAnswerSignal.value === currentQuestion.correct_answer;
              if (isAnswerCorrect) {
                props.correctAnswersSignal.value += 1;
              }
            } else {
              const isSeeResultsRequested =
                currentQuestionIndexSignal.value ===
                props.quiz.value.questions.length - 1;
              if (isSeeResultsRequested) {
                updateStreak();
                props.showResultsSignal.value = true;
                return;
              }

              currentQuestionIndexSignal.value += 1;
              selectedAnswerSignal.value = "";
              revealedAnswerSignal.value = false;
            }
          }}
          disabled={!selectedAnswerSignal.value}
          style={getButtonStyle()}
        >
          {revealedAnswerSignal.value
            ? currentQuestionIndexSignal.value ===
              props.quiz.value.questions.length - 1
              ? "See Results"
              : "Next"
            : "Submit"}
        </button>
      </div>
    </>
  );
});

interface ResultsProps {
  correctAnswersSignal: Signal<number>;
  quiz: Signal<Quiz>;
}
const Results = component$<ResultsProps>((props) => {
  const streak = getStreak();
  return (
    <>
      <div
        style={{
          backgroundColor: colors.bg.primary,
          padding: ".5rem",
          marginBottom: "1rem",
          border: `2px solid ${colors.primary}`,
          textAlign: "center",
          borderRadius: "8px",
        }}
      >
        <p
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            margin: 0,
            color: colors.primary,
          }}
        >
          {props.correctAnswersSignal.value}/{props.quiz.value.questions.length}
        </p>
        <p
          style={{
            fontSize: "1rem",
            color: colors.text.secondary,
            marginTop: "0.5rem",
            fontWeight: "500",
          }}
        >
          Correct Answers
        </p>
      </div>

      <div
        style={{
          backgroundColor: colors.bg.page,
          padding: ".5rem",
          marginBottom: "1rem",
          border: `2px solid ${colors.border}`,
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            margin: 0,
            color: colors.dark,
          }}
        >
          {streak}
        </p>
        <p
          style={{
            fontSize: "1rem",
            color: colors.text.secondary,
            marginTop: "0.5rem",
            fontWeight: "500",
          }}
        >
          {streak === 1 ? "Day Streak" : "Day Streak"}
        </p>
      </div>

      <div
        style={{
          backgroundColor: colors.bg.page,
          padding: ".5rem",
          border: `2px solid ${colors.border}`,
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "1rem",
            color: colors.text.secondary,
            margin: 0,
            fontWeight: "500",
          }}
        >
          Next Quiz Tomorrow
        </p>
      </div>

      {props.quiz.value?.provenance?.length ? (
        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: `2px solid ${colors.border}`,
            textAlign: "left",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: colors.text.primary,
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            Artwork Provenance
          </h3>
          <div
            style={{
              backgroundColor: colors.bg.page,
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            {props.quiz.value.provenance.map((line, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  fontSize: "1rem",
                  lineHeight: "1.6",
                  color: colors.text.secondary,
                  marginBottom:
                    index < props.quiz.value.provenance.length - 1
                      ? "0.75rem"
                      : 0,
                }}
              >
                <span style={{ marginRight: "0.5rem", flexShrink: 0 }}>•</span>
                <span
                  style={{
                    fontWeight:
                      props.quiz.value.provenance.length - 1 === index
                        ? "bold"
                        : "normal",
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
});

export const head: DocumentHead = {
  title: "Seven Questions a Day from the Art Institute of Chicago",
  meta: [
    {
      name: "description",
      content:
        "Built this simple quiz app to test your knowledge about famous artworks from the Art Institute of Chicago.",
    },
  ],
};

export default component$(() => {
  const showResultsSignal = useSignal(false);
  const correctAnswersSignal = useSignal(0);
  const quiz = useQuiz();

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: colors.bg.page,
        position: "relative",
      }}
    >
      <img
        src={quiz.value.image}
        alt="Quiz Image"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          maxHeight: "clamp(200px, 35vh, 400px)",
          objectFit: "cover",
        }}
        width={IMAGE_WIDTH}
        height={IMAGE_HEIGHT}
      />
      <div
        style={{
          backgroundColor: colors.bg.card,
          padding: "1rem",
        }}
      >
        {showResultsSignal.value ? (
          <Results correctAnswersSignal={correctAnswersSignal} quiz={quiz} />
        ) : (
          <Questions
            correctAnswersSignal={correctAnswersSignal}
            showResultsSignal={showResultsSignal}
            quiz={quiz}
          />
        )}
      </div>
    </main>
  );
});
