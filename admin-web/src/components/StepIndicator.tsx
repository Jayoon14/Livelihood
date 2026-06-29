type Props = {

  currentStep: number;

};

const steps = [

  "Personal",

  "Education",

  "Work",

  "Skills",

  "Documents",

  "Confirmation",

];

export default function StepIndicator({

  currentStep,

}: Props) {

  return (

    <div className="flex justify-between items-center">

      {steps.map((step, index) => {

        const number = index + 1;

        const active = currentStep >= number;

        return (

          <div

            key={step}

            className="flex flex-col items-center flex-1 relative"

          >

            <div

              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold

              ${

                active

                  ? "bg-blue-600"

                  : "bg-gray-300"

              }`}

            >

              {number}

            </div>

            <span

              className={`mt-3 text-sm

              ${

                active

                  ? "text-blue-600"

                  : "text-gray-500"

              }`}

            >

              {step}

            </span>

            {index !== 5 && (

              <div

                className={`absolute top-6 left-1/2 w-full h-1

                ${

                  currentStep > number

                    ? "bg-blue-600"

                    : "bg-gray-300"

                }`}

              />

            )}

          </div>

        );

      })}

    </div>

  );

}