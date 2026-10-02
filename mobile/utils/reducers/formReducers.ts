export const reducer = (state: any, action: any) => {
    switch (action.type) {
      // Reset everything back to initialState
      case 'RESET':
        return action.initialState;
  
      // Update one field’s value + validity
      case 'UPDATE': {
        const { inputId, inputValue, validationResult } = action;
  
        const updatedValues = {
          ...state.inputValues,
          [inputId]: inputValue,
        };
  
        const updatedValidities = {
          ...state.inputValidities,
          [inputId]: validationResult,
        };
  
        // Recalculate overall form validity:
        const updatedFormIsValid = Object.values(updatedValidities).every(
          (isValid) => isValid === true
        );
  
        return {
          inputValues: updatedValues,
          inputValidities: updatedValidities,
          formIsValid: updatedFormIsValid,
        };
      }

      case "FORM_INPUT_UPDATE":

      

  
      default:
        return state;
    }
  };
  