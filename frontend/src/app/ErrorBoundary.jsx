import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import i18n from "../i18n";
import Button from "../ui/Button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="mx-auto text-danger-content mb-4" size={56} />
          <h1 className="text-2xl font-bold text-content-primary">
            {i18n.t("common:crash.title")}
          </h1>
          <p className="text-content-secondary mt-2 text-sm">
            {i18n.t("common:crash.body")}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="secondary" onClick={() => window.location.assign("/")}>
              {i18n.t("common:action.goHome")}
            </Button>
            <Button onClick={() => window.location.reload()}>
              {i18n.t("common:crash.reload")}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
