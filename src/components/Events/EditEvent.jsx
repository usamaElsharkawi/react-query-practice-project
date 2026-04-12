import { Link, useNavigate, useParams } from "react-router-dom";

import Modal from "../UI/Modal.jsx";
import EventForm from "./EventForm.jsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEvent, updateEvent } from "../../util/http";
import LoadingIndicator from "../UI/LoadingIndicator.jsx";
import ErrorBlock from "../UI/ErrorBlock.jsx";

export default function EditEvent() {
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["events", params.id],
    queryFn: ({ signal }) => fetchEvent({ id: params.id, signal }),
  });

  const {
    mutate,
    isPending,
    isError: isErrorUpdate,
    error: errorUpdate,
  } = useMutation({
    mutationFn: updateEvent,
    onMutate: async (data) => {
      const newEvent = data.event;
      await queryClient.cancelQueries({ queryKey: ["events", params.id] });
      const previousEvent = queryClient.getQueryData(["events", params.id]);
      queryClient.setQueryData(["events", params.id], newEvent);
      return { previousEvent };
    },
    onError: (error, data, context) => {
      queryClient.setQueryData(["events", params.id], context.previousEvent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events", params.id] });
    },
  });
  function handleSubmit(formData) {
    mutate({ id: params.id, event: formData });
  }

  function handleClose() {
    navigate("../");
  }

  let content;
  if (isLoading) {
    content = (
      <div className="center">
        <LoadingIndicator />
      </div>
    );
  }
  if (isError) {
    content = (
      <div className="center">
        <ErrorBlock
          title="Failed to load event"
          message={error.info?.message || "Failed to load event"}
        />
        <div className="form-actions">
          <Link to="../" className="button">
            Okay
          </Link>
        </div>
      </div>
    );
  }
  if (data) {
    content = (
      <EventForm inputData={data} onSubmit={handleSubmit}>
        {isPending && <p>Updating...</p>}
        {!isPending && (
          <>
            <Link to="../" className="button-text">
              Cancel
            </Link>
            <button type="submit" className="button">
              Update
            </button>
          </>
        )}
        {isErrorUpdate && (
          <ErrorBlock
            title="Failed to update event"
            message={errorUpdate.info?.message || "Failed to update event"}
          />
        )}
      </EventForm>
    );
  }

  return <Modal onClose={handleClose}>{content}</Modal>;
}
