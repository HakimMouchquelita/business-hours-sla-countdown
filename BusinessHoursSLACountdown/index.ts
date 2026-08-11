import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { SLACountdown, ISLACountdownProps } from "./SLACountdown";
import { IBusinessHoursConfig, parseWorkingDays } from "./businessHours";

export class BusinessHoursSLACountdown implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private context: ComponentFramework.Context<IInputs>;

    constructor() {}

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
        this.context = context;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this.context = context;

        // Read the bound deadline field
        const rawDeadline = context.parameters.deadlineField?.raw;
        const deadline: Date | null =
            rawDeadline instanceof Date ? rawDeadline : rawDeadline ? new Date(rawDeadline) : null;

        // Read business hours config with validation
        let startHour = context.parameters.businessHourStart?.raw ?? 9;
        let endHour = context.parameters.businessHourEnd?.raw ?? 17;
        startHour = Math.max(0, Math.min(23, startHour));
        endHour = Math.max(0, Math.min(23, endHour));
        if (endHour <= startHour) {
            // Fallback to a sane default window if misconfigured
            startHour = 9;
            endHour = 17;
        }

        const workingDays = parseWorkingDays(context.parameters.workingDays?.raw);

        const config: IBusinessHoursConfig = {
            startHour,
            endHour,
            workingDays,
        };

        // Thresholds
        let warningHours = context.parameters.warningHours?.raw ?? 4;
        let dangerHours = context.parameters.dangerHours?.raw ?? 1;
        warningHours = Math.max(0, warningHours);
        dangerHours = Math.max(0, dangerHours);
        if (dangerHours >= warningHours) {
            dangerHours = Math.max(0, warningHours - 1);
        }

        const props: ISLACountdownProps = {
            deadline,
            config,
            warningHours,
            dangerHours,
        };

        return React.createElement(SLACountdown, props);
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {}
}
