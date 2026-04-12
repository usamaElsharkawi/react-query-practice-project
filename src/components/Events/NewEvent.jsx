import { Link, useNavigate } from "react-router-dom";
import { createNewEvent } from "../../util/http";
import Modal from "../UI/Modal.jsx";
import EventForm from "./EventForm.jsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ErrorBlock from "../UI/ErrorBlock.jsx";

export default function NewEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  console.log(queryClient);
  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createNewEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["events"],
      });
      navigate("/events");
    },
  });
  function handleSubmit(formData) {
    mutate({ event: formData });
  }

  return (
    <Modal onClose={() => navigate("../")}>
      <EventForm onSubmit={handleSubmit}>
        {isPending ? (
          <p>Creating new event...</p>
        ) : (
          <>
            <Link to="../" className="button-text">
              Cancel
            </Link>
            <button type="submit" className="button">
              Create
            </button>
          </>
        )}
      </EventForm>
      {isError && (
        <ErrorBlock
          title="Failed to create new event"
          message={error.info?.message || "Failed to create event"}
        />
      )}
    </Modal>
  );
}
