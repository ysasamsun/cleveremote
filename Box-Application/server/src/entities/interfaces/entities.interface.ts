
export interface ISynchronize {
    synchronize(data: ISynchronizeParams): any;
}

export interface ISynchronizeParams {
    entity: string;
    data: any;
    action: string;
}

export interface IPartitionTopic {
    rangePartitions: Array<number>;
    current: number;
}

export interface IPartitionConfig {
    config_id: string;
    start_range: number;
    end_range: number;
}

export interface ITopic {
    box?: string;
    name: string;
    partitionTopic?: IPartitionTopic;
}

export interface IUser {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    number_phone: string;
    password: string;
    account?: IAccount;
    providers?: Array<IProvider>;
}

export interface IAccount {
    account_id: string;
    name: string;
    description?: string;
    users: Array<IUser>;
    devices: Array<IDevice>;
}

export interface IDevice {
    device_id: string;
    name: string;
    description?: string;
    account: IAccount;
    config: IPartitionTopic;
}

export interface IProvider {
    provider_id: string;
    user?: IUser;
    provider: string;
    provider_uid: string;
}

export interface ITransceiverConfig {
    config_id: string;
    configuration: Object; // CREATE An object for configuration
    status: string;
}

export interface ITransceiver {
    transceiver_id: string;
    name: string;
    description: string | null;
    address: string;
    type: string;
    config?: ITransceiverConfig | null;
    coordinator?: ITransceiver | null;
    device: IDevice | null;
}
