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

export const useQuiz = routeLoader$(async () => {
  const today = new Date().toJSON().split("T")[0];
  const url = `${process.env.QUIZ_URL}/${today}.json`;
  const response = await fetch(url);
  return (await response.json()) as Quiz;
});

const updateStreak = () => {
  const lastDate = localStorage.getItem("lastDate");
  const now = new Date();

  if (!lastDate) {
    localStorage.setItem("lastDate", now.toISOString());
    return;
  }

  const lastDateTime = new Date(lastDate);
  const diffInMs = now.getTime() - lastDateTime.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInDays > 1) {
    localStorage.setItem("lastDate", now.toISOString());
  }
};

const getStreak = () => {
  const lastDate = localStorage.getItem("lastDate");
  if (!lastDate) {
    return 1;
  }

  const lastDateTime = new Date(lastDate);
  const diffInMs = new Date().getTime() - lastDateTime.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  return diffInDays + 1;
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
      padding: "0.875rem",
      border: "2px solid",
      borderColor,
      backgroundColor,
      cursor: "pointer",
      marginBottom: "0.5rem",
      transition: "all 0.2s",
      fontSize: "0.95rem",
    };
  };

  const getButtonStyle = () => {
    let bgColor = colors.primary;
    if (revealedAnswerSignal.value) {
      bgColor = colors.success;
    }

    return {
      padding: "0.875rem 1.5rem",
      backgroundColor: !selectedAnswerSignal.value ? colors.border : bgColor,
      color: colors.white,
      fontWeight: "600",
      fontSize: "1rem",
      cursor: !selectedAnswerSignal.value ? "not-allowed" : "pointer",
      border: "none",
      transition: "background-color 0.2s",
      width: "100%",
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
          {currentQuestionIndexSignal.value + 1}/7{" "}
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
                props.showResultsSignal.value = true;
                updateStreak();
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
          padding: ".75rem",
          marginBottom: "1rem",
          border: `2px solid ${colors.primary}`,
          textAlign: "center",
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
          padding: ".75rem",
          marginBottom: "1rem",
          border: `2px solid ${colors.border}`,
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
          padding: "1rem",
          border: `2px solid ${colors.border}`,
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
          maxHeight: "46vh",
        }}
        width={IMAGE_WIDTH}
        height={IMAGE_HEIGHT}
      />
      <div style={{ backgroundColor: colors.bg.card, padding: ".6rem" }}>
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
